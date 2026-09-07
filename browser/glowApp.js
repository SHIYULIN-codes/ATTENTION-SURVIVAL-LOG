// File Overview
// Manages the layered glow canvas and luminous effects used by lifeforms and interactions.

// The glow extends a lifeform's response beyond its outline.
(() => {
  "use strict";

  const params = window.AppContext.params;
  const requested = (params.get("render-backend") || "canvas2d").toLowerCase();

  // The glow canvas sits beneath the main canvas; the main canvas receives input events,
  // while hidden mode retains the rendering capability required by tests.
  const styleGlowCanvas = (canvas, hidden) => {
    canvas.id = "layered-glow";
    canvas.setAttribute("aria-hidden", "true");
    Object.assign(canvas.style, {
      position: "fixed",
      left: "0",
      top: "0",
      zIndex: "0",
      pointerEvents: "none",
      visibility: hidden ? "hidden" : "visible",
    });
  };

  class CanvasGlow {
    constructor({ mainCanvas, config, hidden }) {
      this.backend = "canvas2d";
      this.mainCanvas = mainCanvas;
      this.config = config;
      this.canvas = document.createElement("canvas");
      this.maskCanvas = document.createElement("canvas");
      this.context = this.canvas.getContext("2d");
      this.maskContext = this.maskCanvas.getContext("2d");
      if (!this.context || !this.maskContext) {
        throw new Error("Canvas 2D glow contexts are unavailable.");
      }
      styleGlowCanvas(this.canvas, hidden);
    }

    // The 2D backend scales the main layer and mask at an independent resolution,
    // balancing softness against device performance.
    resize(cssWidth, cssHeight) {
      const pixelWidth = Math.max(1, Math.ceil(cssWidth * this.config.resolutionScale));
      const pixelHeight = Math.max(1, Math.ceil(cssHeight * this.config.resolutionScale));
      this.canvas.width = pixelWidth;
      this.canvas.height = pixelHeight;
      this.maskCanvas.width = pixelWidth;
      this.maskCanvas.height = pixelHeight;
      this.canvas.style.width = cssWidth + "px";
      this.canvas.style.height = cssHeight + "px";
    }

    // Extract the outline where alpha is greater than zero from the main canvas,
    // then layer broad and narrow white shadows to create a unified lifeform glow.
    render() {
      const { canvas, context, maskCanvas, maskContext, mainCanvas, config } = this;
      const pixelWidth = canvas.width;
      const pixelHeight = canvas.height;

      maskContext.setTransform(1, 0, 0, 1, 0, 0);
      maskContext.globalAlpha = 1;
      maskContext.globalCompositeOperation = "source-over";
      maskContext.filter = "none";
      maskContext.clearRect(0, 0, pixelWidth, pixelHeight);
      maskContext.imageSmoothingEnabled = true;
      maskContext.imageSmoothingQuality = "high";
      maskContext.drawImage(
        mainCanvas,
        0,
        0,
        mainCanvas.width,
        mainCanvas.height,
        0,
        0,
        pixelWidth,
        pixelHeight
      );
      maskContext.globalCompositeOperation = "source-in";
      maskContext.fillStyle = "#fff";
      maskContext.fillRect(0, 0, pixelWidth, pixelHeight);
      maskContext.globalCompositeOperation = "source-over";

      context.setTransform(1, 0, 0, 1, 0, 0);
      context.clearRect(0, 0, pixelWidth, pixelHeight);
      context.globalCompositeOperation = "source-over";
      // Preserve only the shadow by offsetting the source beyond the canvas.
      const drawPass = (blur, alpha) => {
        const scaledBlur = blur * config.resolutionScale;
        const offset = pixelWidth + Math.ceil(scaledBlur * 4);
        context.shadowColor = `rgba(255, 255, 255, ${alpha})`;
        context.shadowBlur = scaledBlur;
        context.shadowOffsetX = offset;
        context.shadowOffsetY = 0;
        context.drawImage(maskCanvas, -offset, 0);
      };
      context.globalAlpha = 1;
      drawPass(config.wideBlur, config.wideAlpha);
      drawPass(config.coreBlur, config.coreAlpha);
      context.shadowColor = "rgba(0, 0, 0, 0)";
      context.shadowBlur = 0;
      context.shadowOffsetX = 0;
      context.shadowOffsetY = 0;
    }

    // Reading one pixel waits for Canvas drawing to be committed,
    // providing a definite completion point for visual verification.
    synchronize() {
      this.context.getImageData(0, 0, 1, 1);
    }
  }

  const vertexShader = `
    attribute vec2 a_position;
    varying vec2 v_uv;
    void main() {
      v_uv = a_position * 0.5 + 0.5;
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
  `;

  const blurShader = `
    precision mediump float;
    varying vec2 v_uv;
    uniform sampler2D u_texture;
    uniform vec2 u_direction;
    uniform float u_radius;
    void main() {
      vec2 stepUv = u_direction * u_radius;
      float alpha = texture2D(u_texture, v_uv).a * 0.227027;
      alpha += texture2D(u_texture, v_uv + stepUv * 1.384615).a * 0.316216;
      alpha += texture2D(u_texture, v_uv - stepUv * 1.384615).a * 0.316216;
      alpha += texture2D(u_texture, v_uv + stepUv * 3.230769).a * 0.070270;
      alpha += texture2D(u_texture, v_uv - stepUv * 3.230769).a * 0.070270;
      gl_FragColor = vec4(alpha, alpha, alpha, alpha);
    }
  `;

  const combineShader = `
    precision mediump float;
    varying vec2 v_uv;
    uniform sampler2D u_wide;
    uniform sampler2D u_core;
    uniform float u_wideAlpha;
    uniform float u_coreAlpha;
    void main() {
      float wide = texture2D(u_wide, v_uv).a * u_wideAlpha;
      float core = texture2D(u_core, v_uv).a * u_coreAlpha;
      float alpha = 1.0 - (1.0 - wide) * (1.0 - core);
      gl_FragColor = vec4(alpha, alpha, alpha, alpha);
    }
  `;

  const compileShader = (gl, type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const message = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`WebGL shader failed: ${message}`);
    }
    return shader;
  };

  // Link the shared vertex shader with the specified fragment shader to form a glow-processing stage.
  const createProgram = (gl, fragmentSource) => {
    const program = gl.createProgram();
    gl.attachShader(program, compileShader(gl, gl.vertexShader, vertexShader));
    gl.attachShader(program, compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const message = gl.getProgramInfoLog(program);
      gl.deleteProgram(program);
      throw new Error(`WebGL program failed: ${message}`);
    }
    return program;
  };

  class WebGLGlow {
    // This constructor was modified with the assistance of ChatGPT.
    constructor({ mainCanvas, config, hidden }) {
      this.backend = "webgl";
      this.mainCanvas = mainCanvas;
      this.config = config;
      this.canvas = document.createElement("canvas");
      styleGlowCanvas(this.canvas, hidden);
      this.gl = this.canvas.getContext("webgl", {
        alpha: true,
        antialias: false,
        depth: false,
        stencil: false,
        premultipliedAlpha: true,
        preserveDrawingBuffer: true,
      });
      if (!this.gl) throw new Error("WebGL is unavailable.");
      const gl = this.gl;
      this.blurProgram = createProgram(gl, blurShader);
      this.combineProgram = createProgram(gl, combineShader);
      this.positionBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
        gl.STATIC_DRAW
      );
      this.sourceTexture = this.createTexture();
      this.tempTexture = this.createTexture();
      this.wideTexture = this.createTexture();
      this.coreTexture = this.createTexture();
      this.tempFramebuffer = this.createFramebuffer(this.tempTexture);
      this.wideFramebuffer = this.createFramebuffer(this.wideTexture);
      this.coreFramebuffer = this.createFramebuffer(this.coreTexture);
    }

    createTexture() {
      const gl = this.gl;
      const texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return texture;
    }

    // Intermediate textures are attached to separate framebuffers so
    // horizontal and vertical blur can reuse them in successive stages.
    createFramebuffer(texture) {
      const gl = this.gl;
      const framebuffer = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
      gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0,
        gl.TEXTURE_2D,
        texture,
        0
      );
      return framebuffer;
    }

    allocate(texture, width, height) {
      const gl = this.gl;
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    }

    // The WebGL backend resizes the canvas and all intermediate textures together.
    resize(cssWidth, cssHeight) {
      const pixelWidth = Math.max(1, Math.ceil(cssWidth * this.config.resolutionScale));
      const pixelHeight = Math.max(1, Math.ceil(cssHeight * this.config.resolutionScale));
      this.canvas.width = pixelWidth;
      this.canvas.height = pixelHeight;
      this.canvas.style.width = cssWidth + "px";
      this.canvas.style.height = cssHeight + "px";
      for (const texture of [this.tempTexture, this.wideTexture, this.coreTexture]) {
        this.allocate(texture, pixelWidth, pixelHeight);
      }
    }

    // Bind the full-screen program and vertex buffer to prepare
    // a common input for subsequent blur or compositing passes.
    bindProgram(program) {
      const gl = this.gl;
      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
      const location = gl.getAttribLocation(program, "a_position");
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0);
    }

    // Blur along one axis per pass; consecutive horizontal and vertical
    // passes produce two-dimensional softness at a lower sampling cost.
    blur(sourceTexture, targetBuffer, radius, horizontal) {
      const gl = this.gl;
      this.bindProgram(this.blurProgram);
      gl.bindFramebuffer(gl.FRAMEBUFFER, targetBuffer);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, sourceTexture);
      gl.uniform1i(gl.getUniformLocation(this.blurProgram, "u_texture"), 0);
      gl.uniform2f(
        gl.getUniformLocation(this.blurProgram, "u_direction"),
        horizontal ? 1 / this.canvas.width : 0,
        horizontal ? 0 : 1 / this.canvas.height
      );
      gl.uniform1f(gl.getUniformLocation(this.blurProgram, "u_radius"), radius);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    // Upload the current main canvas, generate the broad glow and core glow separately,
    // then composite them into the final transparent glow layer.
    // This method was modified with the assistance of ChatGPT.
    render() {
      const gl = this.gl;
      gl.viewport(0, 0, this.canvas.width, this.canvas.height);
      gl.disable(gl.BLEND);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.bindTexture(gl.TEXTURE_2D, this.sourceTexture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.mainCanvas);

      const wideRadius = Math.max(0.5, this.config.wideBlur * this.config.resolutionScale * 0.34);
      const coreRadius = Math.max(0.5, this.config.coreBlur * this.config.resolutionScale * 0.34);
      this.blur(this.sourceTexture, this.tempFramebuffer, wideRadius, true);
      this.blur(this.tempTexture, this.wideFramebuffer, wideRadius, false);
      this.blur(this.sourceTexture, this.tempFramebuffer, coreRadius, true);
      this.blur(this.tempTexture, this.coreFramebuffer, coreRadius, false);

      this.bindProgram(this.combineProgram);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.wideTexture);
      gl.uniform1i(gl.getUniformLocation(this.combineProgram, "u_wide"), 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.coreTexture);
      gl.uniform1i(gl.getUniformLocation(this.combineProgram, "u_core"), 1);
      gl.uniform1f(gl.getUniformLocation(this.combineProgram, "u_wideAlpha"), this.config.wideAlpha);
      gl.uniform1f(gl.getUniformLocation(this.combineProgram, "u_coreAlpha"), this.config.coreAlpha);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      gl.flush();
    }

    // WebGL verification uses finish to wait for the relevant commands to complete;
    // this synchronization occurs only during verification.
    synchronize() {
      this.gl.finish();
    }
  }

  // Try the requested WebGL backend first; if support is insufficient,
  // transparently fall back to the 2D implementation with the same interface.
  function createGlow(options) {
    const preferWebGL = requested === "webgl" || requested === "auto";
    let renderer = null;
    if (preferWebGL) {
      try {
        renderer = new WebGLGlow(options);
      } catch {}
    }
    if (!renderer) renderer = new CanvasGlow(options);
    options.mainCanvas.parentNode.insertBefore(renderer.canvas, options.mainCanvas);
    return renderer;
  }

  function render(renderer) {
    renderer.render();
  }

  window.GlowApp = Object.freeze({ createGlow, render });
})();

// A shared radial glow makes distinct lifeforms feel as though they belong to the same ecology.
(() => {
  "use strict";

  const gradientStops = Object.freeze([
    Object.freeze([0, 1]),
    Object.freeze([0.12, 0.96]),
    Object.freeze([0.28, 0.7]),
    Object.freeze([0.48, 0.34]),
    Object.freeze([0.68, 0.12]),
    Object.freeze([0.86, 0.025]),
    Object.freeze([1, 0]),
  ]);

  const deepInteractionGradientStops = Object.freeze([
    Object.freeze([0, [220, 246, 255], 1]),
    Object.freeze([0.1, [216, 244, 255], 0.98]),
    Object.freeze([0.24, [205, 239, 255], 0.78]),
    Object.freeze([0.42, [192, 232, 255], 0.42]),
    Object.freeze([0.62, [180, 225, 255], 0.16]),
    Object.freeze([0.8, [170, 219, 255], 0.045]),
    Object.freeze([0.93, [166, 217, 255], 0.008]),
    Object.freeze([1, [164, 216, 255], 0]),
  ]);

  function pulse(timeMs, speed, phase = 0) {
    return 0.5 + 0.5 * Math.sin(timeMs * speed + phase);
  }

  // Combine participant pulse, scale, and opacity into a unified
  // radius and intensity that different glow entry points can reuse.
  function participantMetrics({
    baseRadius,
    pulseValue,
    scale,
    pulseScale,
    alpha,
    radiusScale = 1,
    alphaScale = 1,
    opacity = 1,
  }) {
    return {
      radius:
        baseRadius *
        scale *
        radiusScale *
        (1 + pulseValue * pulseScale),
      alpha:
        alpha *
        alphaScale *
        opacity *
        (0.84 + pulseValue * 0.16),
    };
  }

  function drawRadialGradient(
    context,
    { x, y, radius, alpha, color = [255, 255, 255] }
  ) {
    if (
      !context ||
      !Number.isFinite(x) ||
      !Number.isFinite(y) ||
      !Number.isFinite(radius) ||
      radius <= 0 ||
      !Number.isFinite(alpha) ||
      alpha <= 0
    ) {
      return false;
    }
    const resolvedAlpha = Math.max(0, Math.min(1, alpha));
    const gradient = context.createRadialGradient(
      x,
      y,
      0,
      x,
      y,
      radius
    );
    for (const [offset, alphaScale] of gradientStops) {
      gradient.addColorStop(
        offset,
        `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${
          resolvedAlpha * alphaScale
        })`
      );
    }
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
    return true;
  }

  // Focus onset and expansion progress converge into the Deep Diver glow parameters,
  // creating a natural transition between stages.
  function deepInteractionMetrics({
    baseRadius,
    introProgress,
    expansionProgress,
    introScale,
    scale,
    introAlpha,
    alpha,
    opacity = 1,
  }) {
    const intro = Math.max(0, Math.min(1, introProgress || 0));
    const expansion = Math.max(
      0,
      Math.min(1, expansionProgress || 0)
    );
    const initialScale = introScale * intro;
    return {
      radius:
        baseRadius *
        (initialScale + (scale - initialScale) * expansion),
      alpha:
        (introAlpha * intro +
          (alpha - introAlpha * intro) * expansion) *
        Math.max(0, opacity),
    };
  }

  function drawDeepInteractionGradient(
    context,
    { x, y, radius, alpha }
  ) {
    if (
      !context ||
      !Number.isFinite(x) ||
      !Number.isFinite(y) ||
      !Number.isFinite(radius) ||
      radius <= 0 ||
      !Number.isFinite(alpha) ||
      alpha <= 0
    ) {
      return false;
    }
    const resolvedAlpha = Math.max(0, Math.min(1, alpha));
    const gradient = context.createRadialGradient(
      x,
      y,
      0,
      x,
      y,
      radius
    );
    for (const [offset, color, alphaScale] of deepInteractionGradientStops) {
      gradient.addColorStop(
        offset,
        `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${
          resolvedAlpha * alphaScale
        })`
      );
    }
    context.save();
    context.globalCompositeOperation = "screen";
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
    context.restore();
    return true;
  }

  // Repeat extra waveform points at both ends to close the curve.
  function drawWaveRing(points) {
    const segments = points.length;
    beginShape();
    for (let index = -1; index <= segments + 1; index++) {
      const wrapped = ((index % segments) + segments) % segments;
      curveVertex(points[wrapped][0], points[wrapped][1]);
    }
    endShape(CLOSE);
  }

  window.SoftGlowApp = Object.freeze({
    deepInteractionMetrics,
    drawDeepInteractionGradient,
    drawRadialGradient,
    participantMetrics,
    pulse,
    drawWaveRing,
  });
})();
