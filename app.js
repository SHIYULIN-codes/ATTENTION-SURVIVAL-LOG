// File Overview
// Detects the runtime mode, loads browser dependencies, and reports startup
// or resource-loading failures.

// Display runtime errors in one place to support troubleshooting in production.
(() => {
  "use strict";

  const issues = new Map();
  let panel = null;
  let ready = false;

  // The diagnostics panel appears when needed and remains separate
  // from the interaction layer experienced by the audience.
  function ensurePanel() {
    if (panel || !document.body) return panel;
    panel = document.createElement("section");
    panel.id = "runtime-diagnostics";
    panel.setAttribute("role", "status");
    panel.setAttribute("aria-live", "polite");
    Object.assign(panel.style, {
      position: "fixed",
      left: "16px",
      bottom: "16px",
      zIndex: "9999",
      maxWidth: "min(440px, calc(100vw - 32px))",
      padding: "12px 14px",
      border: "1px solid rgba(255, 255, 255, 0.24)",
      borderRadius: "10px",
      background: "rgba(5, 12, 36, 0.94)",
      boxShadow: "0 10px 32px rgba(0, 0, 0, 0.36)",
      color: "#fff",
      font: "14px/1.45 Arial, sans-serif",
      whiteSpace: "pre-wrap",
      pointerEvents: "none",
      display: "none",
    });
    document.body.appendChild(panel);
    return panel;
  }

  // Present current issues together; once the system recovers,
  // collapse the panel and return the view to the live ecology.
  function renderIssues() {
    const element = ensurePanel();
    if (!element) return;
    const visibleIssues = [...issues.values()];
    if (!visibleIssues.length) {
      element.style.display = "none";
      element.textContent = "";
      return;
    }
    element.style.display = "block";
    element.textContent = visibleIssues
      .map((issue) => `${issue.title}\n${issue.message}`)
      .join("\n\n");
  }

  // Update diagnostics by stable identifier; when the same issue recurs,
  // replace the previous content and synchronize the screen and console.
  function report(id, level, title, message) {
    issues.set(id, { level, title, message });
    renderIssues();
    const logger = level === "error" ? console.error : console.warn;
    logger(`[${title}] ${message}`);
  }

  // Update the panel after removing an existing diagnostic.
  function clear(id) {
    if (!issues.delete(id)) return;
    renderIssues();
  }

  // Dependency-loading errors enter the diagnostics collection under a stable identifier;
  // repeated failures update the same record.
  function reportLoadError(name, source) {
    report(
      `dependency:${name}`,
      "error",
      "Resource loading failed",
      `${name} could not be loaded. Check the network connection or file path.\n${source || ""}`.trim()
    );
  }

  // Remove the timeout notice after the ecology starts;
  // subsequent resource errors continue to appear separately.
  function markReady() {
    ready = true;
    clear("startup-timeout");
  }

  window.addEventListener(
    "error",
    (event) => {
      const target = event.target;
      if (target instanceof HTMLScriptElement) {
        reportLoadError(target.dataset.dependency || "script", target.src);
        return;
      }
      report(
        `runtime:${event.filename || "unknown"}:${event.lineno || 0}`,
        "error",
        "Runtime error",
        `${event.message || "Unknown error"}${
          event.filename ? `\n${event.filename}:${event.lineno || 0}` : ""
        }`
      );
    },
    true
  );

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    report(
      "unhandled-promise",
      "error",
      "Asynchronous operation failed",
      reason?.message || String(reason || "Unknown error")
    );
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderIssues, { once: true });
  }

  window.setTimeout(() => {
    if (ready) return;
    report(
      "startup-timeout",
      "error",
      "Application startup timed out",
      "The canvas did not finish initializing within 10 seconds. Check the browser console."
    );
  }, 10000);

  window.AppDiagnostics = {
    clear,
    markReady,
    reportLoadError,
  };
})();

// Load scripts in system-dependency order so every layer is ready before the application starts.
// This code was modified with the assistance of ChatGPT.
(() => {
  "use strict";

  if (document.readyState !== "loading") {
    throw new Error("app.js must be loaded while the document is being parsed.");
  }

  const loaderUrl = new URL(document.currentScript?.src || window.location.href);
  const buildVersion = loaderUrl.searchParams.get("v") || "dev";
  const params = new URLSearchParams(window.location.search);
  const mode = Object.freeze({
    visualTest: params.get("visual-test") === "1",
    performanceTest: params.get("performance-test") === "1",
    interactionTest: params.get("interaction-test") === "1",
    ecosystemStoreTest:
      params.get("ecosystem-store-test") === "1" ||
      params.get("ecosystem-persistence-test") === "1",
    interactionDisabled: params.get("interaction") === "0",
  });
  const needsMl5 = !(
    mode.visualTest ||
    mode.performanceTest ||
    mode.interactionTest ||
    mode.ecosystemStoreTest ||
    mode.interactionDisabled
  );

  window.AppContext = Object.freeze({
    buildVersion,
    params,
    mode,
    needsMl5,
  });

  const sources = Object.freeze([
    "vendor/p5-1.11.11.min.js",
    ...(needsMl5 ? ["vendor/ml5-1.3.1.min.js"] : []),
    "dist/application.bundle.js",
  ]);
  const seen = new Set();

  for (const path of sources) {
    if (seen.has(path)) {
      throw new Error(`Duplicate browser dependency: ${path}`);
    }
    seen.add(path);
    const name = path.slice(path.lastIndexOf("/") + 1);
    const source = `${path}?v=${buildVersion}`;
    document.write(
      `<script data-dependency="${name}" src="${source}"><\/script>`
    );
  }
})();
