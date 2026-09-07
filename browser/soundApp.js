// File Overview
// Synthesizes restrained audio cues for ecological and interaction events
// through the Web Audio API.

(() => {
  "use strict";

// I leave the main narrative to the visuals; sound
// signals ecological changes from the edge of perception.
// Cues are synthesized live with Web Audio and triggered by interactions.
// Voice limits and cooldowns control cue density, while low-pass
// filtering and compression shape the spectrum and dynamic range.
  const fallbackConfig = Object.freeze({
    enabled: true,
    masterGain: 1.2,
    maximumVoices: 4,
    maximumPan: 0.7,
    pauseFadeMs: 500,
    resumeFadeMs: 900,
    cooldownMs: Object.freeze({
      "participant-join": 700,
      "eyes-close": 600,
      "eyes-open": 600,
      "predator-lure": 1500,
    }),
  });

  const config = window.SketchConfig?.soundConfig || fallbackConfig;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const state = {
    setup: false,
    enabled: config.enabled !== false,
    context: null,
    input: null,
    calmFilter: null,
    master: null,
    compressor: null,
    unlocked: false,
    unlockPending: false,
    paused: false,
    hidden: document.hidden,
    sequence: 0,
    cues: [],
    cueCounts: new Map(),
    lastCueAt: new Map(),
    activeGroups: new Map(),
    joinRvrbImpls: null,
    pendingCues: [],
  };

  const clamp = window.NumericApp.clamp;
  const nowMs = () =>
    typeof performance !== "undefined" && performance.now
      ? performance.now()
      : Date.now();
  const seconds = (milliseconds) => Math.max(0, milliseconds) / 1000;
  const nmnlMstrGain = () => clamp(Number(config.masterGain) || 1, 0, 1.2);
  const setParam = (param, value, at) => param.setValueAtTime(value, at);
  const cancelParam = (param, at) => param.cancelScheduledValues(at);
  const expRamp = (param, value, at) =>
    param.exponentialRampToValueAtTime(value, at);
  const lineRamp = (param, value, at) =>
    param.linearRampToValueAtTime(value, at);

// Prefer the supplied pan value; when absent, set stereo
// position from the lifeform's horizontal position.
  function panFor(options = {}) {
    if (Number.isFinite(options.pan)) {
      return clamp(options.pan, -config.maximumPan, config.maximumPan);
    }
    const x = Number(options.x);
    const viewportWidth = Math.max(
      1,
      Number(options.width) || Number(window.width) || window.innerWidth || 1
    );
    if (!Number.isFinite(x)) return 0;
    return clamp(
      (x / viewportWidth) * 2 - 1,
      -config.maximumPan,
      config.maximumPan
    );
  }

  function ensureGraph() {
    if (state.context || !state.enabled || !AudioCtx) {
      return state.context;
    }
    const context = new AudioCtx({ latencyHint: "interactive" });
    const input = context.createGain();
    const calmFilter = context.createBiquadFilter();
    const master = context.createGain();
    const compressor = context.createDynamicsCompressor();

// Low-pass filtering attenuates high frequencies, keeping sound at the edge of perception.
    calmFilter.type = "lowpass";
    setParam(calmFilter.frequency, 16000, context.currentTime);
    setParam(calmFilter.Q, 0.2, context.currentTime);
    setParam(master.gain, nmnlMstrGain(), context.currentTime);
    setParam(compressor.threshold, -20, context.currentTime);
    setParam(compressor.knee, 18, context.currentTime);
    setParam(compressor.ratio, 5, context.currentTime);
    setParam(compressor.attack, 0.02, context.currentTime);
    setParam(compressor.release, 0.35, context.currentTime);

    input.connect(calmFilter);
    calmFilter.connect(master);
    master.connect(compressor);
    compressor.connect(context.destination);

    state.context = context;
    state.input = input;
    state.calmFilter = calmFilter;
    state.master = master;
    state.compressor = compressor;
    return context;
  }

// Wake browser audio after a user gesture.
  async function unlock() {
    if (!state.enabled || !AudioCtx) return false;
    const context = ensureGraph();
    if (!context) return false;
    state.unlockPending = true;
    try {
      if (context.state !== "running") await context.resume();
      state.unlocked = context.state === "running";
      if (state.unlocked) {
        removeUnlocks();
        flshWaitCues();
      }
      return state.unlocked;
    } catch {
      return false;
    } finally {
      state.unlockPending = false;
    }
  }

  function hndlUnlckGstr() {
    unlock();
  }

  function addUnlckList() {
    document.addEventListener("pointerdown", hndlUnlckGstr, {
      capture: true,
      passive: true,
    });
    document.addEventListener("keydown", hndlUnlckGstr, true);
  }

  function removeUnlocks() {
    document.removeEventListener("pointerdown", hndlUnlckGstr, true);
    document.removeEventListener("keydown", hndlUnlckGstr, true);
  }

  // Preserve the parameter value before changing automation curves;
  // older browsers cancel future scheduling and restore the current read value.
  function holdParam(parameter, at) {
    if (typeof parameter.cancelAndHoldAtTime === "function") {
      parameter.cancelAndHoldAtTime(at);
      return;
    }
    const value = Math.max(0.0001, Number(parameter.value) || 0.0001);
    cancelParam(parameter, at);
    setParam(parameter, value, at);
  }

  function discGrp(group) {
    if (!group) return;
    if (group.tailTimer != null) {
      window.clearTimeout(group.tailTimer);
      group.tailTimer = null;
    }
    if (state.activeGroups.get(group.key) === group) {
      state.activeGroups.delete(group.key);
    }
    try {
      group.gain.disconnect();
      group.panner.disconnect();
      group.reverb?.disconnect();
      group.reverbGain?.disconnect();
      for (const node of group.voiceNodes || []) node.disconnect();
    } catch {
      // Audio nodes may already be disconnected when the page closes.
    }
  }

  // Preserve the reverb tail after sources in the group end, then disconnect the nodes.
  function retireGroup(group) {
    if (!group || group.remaining > 0 || group.tailTimer != null) return;
    if (group.tailMs > 0) {
      group.tailTimer = window.setTimeout(() => discGrp(group), group.tailMs);
      return;
    }
    discGrp(group);
  }

  // Generate and cache a short reverb impulse when multiple participants first join;
  // later cues reuse the same acoustic space.
  function joinRvrbImpls() {
    if (state.joinRvrbImpls || !state.context?.createBuffer) {
      return state.joinRvrbImpls;
    }
    const context = state.context;
    const duration = 0.82;
    const length = Math.max(1, Math.floor(context.sampleRate * duration));
    const impulse = context.createBuffer(2, length, context.sampleRate);
    for (let channel = 0; channel < impulse.numberOfChannels; channel++) {
      const samples = impulse.getChannelData(channel);
      for (let index = 0; index < samples.length; index++) {
        const progress = index / samples.length;
        samples[index] = (Math.random() * 2 - 1) * Math.pow(1 - progress, 3.45);
      }
    }
    state.joinRvrbImpls = impulse;
    return impulse;
  }

  function stopGroup(group, releaseSeconds = 0.45) {
    if (!group || group.stopping || !state.context) return false;
    group.stopping = true;
    const at = state.context.currentTime;
    const release = Math.max(0.02, releaseSeconds);
    holdParam(group.gain.gain, at);
    expRamp(group.gain.gain, 0.0001, at + release);
    for (const source of group.sources) {
      try {
        source.stop(at + release + 0.05);
      } catch {
// A source may have ended naturally; cleanup continues for the remaining nodes.
      }
    }
    return true;
  }

  function stop(key, releaseMs = 450) {
    return stopGroup(state.activeGroups.get(String(key)), seconds(releaseMs));
  }

  // When the voice limit is reached, release older low-priority sounds first.
  function chsVcToFree(priority) {
    return [...state.activeGroups.values()]
      .filter((group) => group.priority <= priority)
      .sort((a, b) => a.priority - b.priority || a.startedAt - b.startedAt)[0];
  }

  // Audio-node creation and voice lifecycle
  // This function was modified with the assistance of ChatGPT.
  function createGroup(key, options = {}) {
    const context = state.context;
    if (!context || !state.input) return null;
    const normalizedKey = String(key || `sound:${++state.sequence}`);
    const existing = state.activeGroups.get(normalizedKey);
    if (existing) stopGroup(existing, 0.08);

    const priority = Number(options.priority) || 1;
    const maximumVoices = Math.max(1, Number(config.maximumVoices) || 4);
    if (state.activeGroups.size >= maximumVoices) {
      const candidate = chsVcToFree(priority);
      if (!candidate) return null;
      stopGroup(candidate, 0.16);
    }

    const gain = context.createGain();
    const panner = context.createStereoPanner
      ? context.createStereoPanner()
      : context.createGain();
    setParam(gain.gain, 1, context.currentTime);
    if (panner.pan) setParam(panner.pan, panFor(options), context.currentTime);
    gain.connect(panner);
    panner.connect(state.input);

    const reverbMix = clamp(Number(options.reverbMix) || 0, 0, 0.18);
    let reverb = null;
    let reverbGain = null;
    if (reverbMix > 0 && context.createConvolver) {
      const impulse = joinRvrbImpls();
      if (impulse) {
        reverb = context.createConvolver();
        reverbGain = context.createGain();
        reverb.buffer = impulse;
        setParam(reverbGain.gain, reverbMix, context.currentTime);
        panner.connect(reverb);
        reverb.connect(reverbGain);
        reverbGain.connect(state.input);
      }
    }

    const group = {
      key: normalizedKey,
      priority,
      gain,
      panner,
      reverb,
      reverbGain,
      voiceNodes: new Set(),
      sources: new Set(),
      remaining: 0,
      stopping: false,
      tailMs: reverb ? 820 : 0,
      tailTimer: null,
      startedAt: nowMs(),
    };
    state.activeGroups.set(normalizedKey, group);
    return group;
  }

  // A source's lifecycle is counted within its cue group;
  // when the last source ends, the entire group is reclaimed.
  function trackSource(group, source) {
    if (!group || !source) return;
    group.sources.add(source);
    group.remaining++;
    source.addEventListener(
      "ended",
      () => {
        group.sources.delete(source);
        group.remaining = Math.max(0, group.remaining - 1);
        retireGroup(group);
      },
      { once: true }
    );
  }

  // This function was modified with the assistance of ChatGPT.
  function oscillator(group, options = {}) {
    if (!group || !state.context) return null;
    const context = state.context;
    const source = context.createOscillator();
    const voiceGain = context.createGain();
    const startAt = context.currentTime + Math.max(0, Number(options.start) || 0);
    const duration = Math.max(0.06, Number(options.duration) || 0.6);
    const endAt = startAt + duration;
    const attack = clamp(Number(options.attack) || 0.08, 0.005, duration * 0.6);
    const release = clamp(Number(options.release) || 0.35, 0.02, duration * 0.8);
    const peak = clamp(Number(options.level) || 0.05, 0.0001, 0.22);
    const frequency = Math.max(20, Number(options.frequency) || 220);
    const endFrequency = Math.max(
      20,
      Number(options.endFrequency) || frequency
    );

    source.type = options.wave || "sine";
    setParam(source.frequency, frequency, startAt);
    expRamp(source.frequency, endFrequency, endAt);
    if (Number.isFinite(options.detune)) {
      setParam(source.detune, options.detune, startAt);
    }
    setParam(voiceGain.gain, 0.0001, startAt);
    expRamp(voiceGain.gain, peak, startAt + attack);
    setParam(voiceGain.gain, 
      peak,
      Math.max(startAt + attack, endAt - release)
    );
    expRamp(voiceGain.gain, 0.0001, endAt);

    source.connect(voiceGain);
    const hasVoicePan =
      context.createStereoPanner &&
      (Number.isFinite(options.panStart) || Number.isFinite(options.panEnd));
    if (hasVoicePan) {
      const voicePanner = context.createStereoPanner();
      const panStart = clamp(Number(options.panStart) || 0, -0.5, 0.5);
      const panEnd = clamp(
        Number.isFinite(options.panEnd) ? Number(options.panEnd) : panStart,
        -0.5,
        0.5
      );
      setParam(voicePanner.pan, panStart, startAt);
      lineRamp(voicePanner.pan, 
        panEnd,
        Math.min(endAt, startAt + Math.max(0.2, Number(options.panDuration) || 1.05))
      );
      voiceGain.connect(voicePanner);
      voicePanner.connect(group.gain);
      group.voiceNodes.add(voicePanner);
    } else {
      voiceGain.connect(group.gain);
    }
    group.voiceNodes.add(voiceGain);
    trackSource(group, source);
    source.start(startAt);
    source.stop(endAt + 0.04);
    return source;
  }

  function noiseBurst(group, options = {}) {
    if (!group || !state.context) return null;
    const context = state.context;
    const startAt = context.currentTime + Math.max(0, Number(options.start) || 0);
    const duration = Math.max(0.12, Number(options.duration) || 0.8);
    const sampleCount = Math.max(1, Math.ceil(context.sampleRate * duration));
    const buffer = context.createBuffer(1, sampleCount, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < sampleCount; index++) {
      data[index] = Math.random() * 2 - 1;
    }

    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const voiceGain = context.createGain();
    const endAt = startAt + duration;
    const attack = clamp(Number(options.attack) || 0.18, 0.01, duration * 0.5);
    const release = clamp(Number(options.release) || 0.45, 0.04, duration * 0.8);
    const peak = clamp(Number(options.level) || 0.018, 0.0001, 0.08);

    source.buffer = buffer;
    filter.type = options.filterType || "bandpass";
    setParam(filter.frequency, 
      Math.max(40, Number(options.frequency) || 900),
      startAt
    );
    expRamp(filter.frequency, 
      Math.max(40, Number(options.endFrequency) || 450),
      endAt
    );
    setParam(filter.Q, Number(options.q) || 0.7, startAt);
    setParam(voiceGain.gain, 0.0001, startAt);
    expRamp(voiceGain.gain, peak, startAt + attack);
    setParam(voiceGain.gain, peak, Math.max(startAt + attack, endAt - release));
    expRamp(voiceGain.gain, 0.0001, endAt);

    source.connect(filter);
    filter.connect(voiceGain);
    voiceGain.connect(group.gain);
    trackSource(group, source);
    source.start(startAt);
    source.stop(endAt + 0.04);
    return source;
  }

// The join cue layers voices according to participant count,
// providing an audible response for each new participant.
  function synthUserJoin(group, options = {}) {
    const participantCount = clamp(
      Math.round(Number(options.participantCount) || 1),
      1,
      4
    );
    const voiceCount = clamp(participantCount + 1, 2, 4);
    const stability = clamp(Number(options.stability) || 0.75, 0.55, 1);
    const frequencies = [196, 293.66, 392, 493.88];
    const levels = [0.036, 0.023, 0.014, 0.009];
    const panSpreads = {
      2: [-0.08, 0.08],
      3: [-0.14, 0, 0.14],
      4: [-0.16, -0.055, 0.055, 0.16],
    };
    const harmClrty = 0.82 + stability * 0.18;

    for (let index = 0; index < voiceCount; index++) {
      const isCore = index === 0;
      const start = [0, 0.2, 0.34, 0.46][index];
      const duration = [1.75, 1.55, 1.3, 1.1][index];
      oscillator(group, {
        wave: "sine",
        frequency: frequencies[index],
        endFrequency: frequencies[index],
        start,
        duration,
        attack: (isCore ? 0.3 : 0.26 + index * 0.055) + (1 - stability) * 0.1,
        release: isCore || index === 1 ? 0.58 : 0.52,
        level: levels[index] * (isCore ? 1 : harmClrty),
        panStart: 0,
        panEnd: panSpreads[voiceCount][index],
        panDuration: 1.05,
      });
    }
  }

  const eyeCueLvlScl = 0.8;
  const prdtLureLvl = 1.3;

// When eyes close, descending pitch and noise signal attention drawing inward.
  function synthEyesClose(group) {
    oscillator(group, {
      wave: "triangle",
      frequency: 320,
      endFrequency: 180,
      duration: 0.9,
      attack: 0.2,
      release: 0.58,
      level: 0.045 * eyeCueLvlScl,
    });
    noiseBurst(group, {
      frequency: 1200,
      endFrequency: 280,
      duration: 0.9,
      attack: 0.14,
      release: 0.6,
      level: 0.009 * eyeCueLvlScl,
    });
  }

// Predator's displaced high-frequency sequence resembles
// a flickering signal, drawing attention with restraint.
  function synthPrdtLure(group) {
    [380, 480, 620].forEach((frequency, index) => {
      oscillator(group, {
        frequency,
        endFrequency: frequency * 1.04,
        start: index * 0.11,
        duration: 0.58,
        attack: 0.05,
        release: 0.46,
        level:
          [0.045, 0.033, 0.022][index] *
          eyeCueLvlScl *
          prdtLureLvl,
      });
    });
  }

// When eyes reopen, an ascending pure tone opens attention again,
// clearly answering the descending timbre of eye closure.
  function synthEyesOpen(group) {
    oscillator(group, {
      wave: "sine",
      frequency: 523.25,
      endFrequency: 523.25,
      duration: 0.62,
      attack: 0.055,
      release: 0.44,
      level: 0.034,
    });
    oscillator(group, {
      wave: "sine",
      frequency: 659.25,
      endFrequency: 659.25,
      start: 0.24,
      duration: 0.72,
      attack: 0.06,
      release: 0.5,
      level: 0.026,
    });
  }

  // The unified dispatch entry point maps narrative cue types to synthesizers.
  function synth(type, group, options) {
    switch (type) {
      case "participant-join":
        synthUserJoin(group, options);
        break;
      case "eyes-close":
        synthEyesClose(group);
        break;
      case "eyes-open":
        synthEyesOpen(group);
        break;
      case "predator-lure":
        synthPrdtLure(group);
        break;
      default:
        return false;
    }
    return true;
  }

  // Create an independent audio group for each cue and reclaim it immediately if synthesis fails.
  function playCue(type, options) {
    const groupKey =
      options.key == null ? `${type}:${++state.sequence}` : String(options.key);
    const group = createGroup(groupKey, options);
    if (!group) return false;
    if (!synth(type, group, options)) {
      discGrp(group);
      return false;
    }
    return true;
  }

  function flshWaitCues() {
    if (!state.unlocked || state.context?.state !== "running") return;
    const pending = state.pendingCues.splice(0);
    for (const entry of pending) playCue(entry.type, entry.options);
  }

  // This function was modified with the assistance of ChatGPT.
  function cue(type, options = {}) {
    if (!state.setup) setup();
    const normalizedType = String(type || "");
    if (!normalizedType) return false;
    const at = nowMs();
    const cooldownKey = String(options.cooldownKey || normalizedType);
    const cooldown = Math.max(
      0,
      Number(options.cooldownMs) || Number(config.cooldownMs?.[normalizedType]) || 0
    );
    if (at - (state.lastCueAt.get(cooldownKey) ?? -Infinity) < cooldown) {
      return false;
    }
    state.lastCueAt.set(cooldownKey, at);
    state.cueCounts.set(
      normalizedType,
      (state.cueCounts.get(normalizedType) || 0) + 1
    );
    const event = {
      type: normalizedType,
      at,
      key: options.key == null ? null : String(options.key),
      species: options.species == null ? null : String(options.species),
      pan: panFor(options),
      participantCount: Number.isFinite(options.participantCount)
        ? clamp(Math.round(options.participantCount), 1, 4)
        : null,
      stability: Number.isFinite(options.stability)
        ? clamp(options.stability, 0, 1)
        : null,
      inputMode: options.inputMode == null ? null : String(options.inputMode),
    };
    state.cues.push(event);
    if (state.cues.length > 64) state.cues.shift();

    if (!state.enabled || state.paused || state.hidden || !state.context) {
      return true;
    }
    if (!state.unlocked || state.context.state !== "running") {
      if (state.unlockPending) {
        state.pendingCues.push({ type: normalizedType, options: { ...options } });
        if (state.pendingCues.length > 8) state.pendingCues.shift();
      }
      return true;
    }
    return playCue(normalizedType, options);
  }

  function userJnd(options = {}) {
    const participantId = Math.max(0, Math.trunc(Number(options.participantId) || 0));
    const assignmentId = String(options.assignmentId || "default");
    const identity = `${participantId}:${assignmentId}`;
    return cue("participant-join", {
      ...options,
      key: `participant-join:${identity}`,
      cooldownKey: `participant-join:${identity}`,
      priority: 2,
      reverbMix: 0,
    });
  }

  // To pause, smoothly lower the master volume before suspending the audio context.
  async function pause() {
    state.paused = true;
    if (!state.context || !state.master) return true;
    const context = state.context;
    const at = context.currentTime;
    const fade = seconds(config.pauseFadeMs || 500);
    holdParam(state.master.gain, at);
    expRamp(state.master.gain, 0.0001, at + fade);
    window.setTimeout(() => {
      if (state.paused && context.state === "running") context.suspend();
    }, Math.ceil(fade * 1000 + 40));
    return true;
  }

  // On resume, restart the audio context and fade to the nominal volume;
  // remain silent while locked or while the page is hidden.
  async function resume() {
    state.paused = false;
    if (!state.context || !state.unlocked || state.hidden) return false;
    try {
      if (state.context.state !== "running") await state.context.resume();
      const at = state.context.currentTime;
      const fade = seconds(config.resumeFadeMs || 900);
      cancelParam(state.master.gain, at);
      setParam(state.master.gain, 0.0001, at);
      expRamp(state.master.gain, 
        nmnlMstrGain(),
        at + fade
      );
      return true;
    } catch {
      return false;
    }
  }

  // Pause audio while the page is hidden and resume the
  // unlocked audio context when the page becomes visible again.
  function onVisChange() {
    state.hidden = document.hidden;
    if (state.hidden) {
      if (state.context?.state === "running") state.context.suspend();
      return;
    }
    if (!state.paused && state.unlocked) {
      resume();
    }
  }

  function dispose() {
    removeUnlocks();
    document.removeEventListener("visibilitychange", onVisChange);
    for (const group of state.activeGroups.values()) discGrp(group);
    state.activeGroups.clear();
    if (state.context && state.context.state !== "closed") state.context.close();
    state.context = null;
    state.input = null;
    state.calmFilter = null;
    state.master = null;
    state.compressor = null;
    state.joinRvrbImpls = null;
    state.unlocked = false;
    state.unlockPending = false;
    state.pendingCues.length = 0;
  }

  function setup(options = {}) {
    if (state.setup) return state.enabled;
    state.setup = true;
    if (Object.prototype.hasOwnProperty.call(options, "enabled")) {
      state.enabled = Boolean(options.enabled) && config.enabled !== false;
    }
    if (!state.enabled || !AudioCtx) return false;
    addUnlckList();
    document.addEventListener("visibilitychange", onVisChange);
    window.addEventListener("pagehide", dispose, { once: true });
    return true;
  }

  window.SoundApp = Object.freeze({
    setup,
    cue,
    userJnd,
    stop,
    pause,
    resume,
  });

})();
