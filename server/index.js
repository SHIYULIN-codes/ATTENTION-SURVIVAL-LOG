// File Overview
// Runs the HTTP and WebSocket service that coordinates the project's primary
// shared ecology across connected participants.

"use strict";

// Changes from different devices converge into one shared ecology,
// and the updated world state then returns to every connected instance.
const http = require("node:http");
const path = require("node:path");
const { URL } = require("node:url");
const { WebSocketServer, WebSocket } = require("ws");
const db = require("./db.js");
const ecologyConstants = require("../shared/ecologyConstants.js");
const { createStaticResponder } = require("./staticFiles.js");

const root = path.resolve(__dirname, "..");
const port = Math.max(1, Number(process.env.PORT) || 10000);
const adminToken = String(process.env.ECOLOGY_ADMIN_TOKEN || "");
const logSpecies = new Set([
  ...ecologyConstants.species,
  ecologyConstants.lifeType.basicCell,
]);
const clients = new Map();
let connectionSequence = 0;
let historyPruneTimer = null;

// All endpoint responses use the same immediate-refresh and cross-origin policies.
function json(response, status, body) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "content-type, authorization",
    "access-control-allow-methods": "GET, POST, OPTIONS",
  });
  response.end(JSON.stringify(body));
}

// Enforce the request-body size limit before parsing JSON.
// This function was modified with the assistance of ChatGPT.
function readBody(request, maximum = 65536) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > maximum) {
        reject(new Error("request-too-large"));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => {
      try {
        resolve(chunks.length ? JSON.parse(Buffer.concat(chunks)) : {});
      } catch {
        reject(new Error("invalid-json"));
      }
    });
    request.on("error", reject);
  });
}

// External identifiers allow a bounded length of safe characters;
// connection and database boundaries receive validated text.
function safeId(value, maximum = 120) {
  const id = String(value || "");
  return /^[a-zA-Z0-9._:-]+$/.test(id) && id.length <= maximum ? id : null;
}

function hasAdminAccess(request) {
  return Boolean(
    adminToken && request.headers.authorization === `Bearer ${adminToken}`
  );
}

function safeTimestamp(value) {
  if (!value) return null;
  const timestamp = new Date(value);
  return Number.isFinite(timestamp.getTime()) ? timestamp.toISOString() : null;
}

// The earliest-connected device still online serves as the authority device; after disconnection,
// authority passes naturally to the next connection.
function leaderDeviceId() {
  let leader = null;
  for (const state of clients.values()) {
    if (!state.deviceId) continue;
    if (!leader || state.sequence < leader.sequence) leader = state;
  }
  return leader?.deviceId || null;
}

// The authority snapshot exposes the authority device's identity and deduplicated device count;
// internal connection state remains on the server.
function authority() {
  return {
    leaderDeviceId: leaderDeviceId(),
    connectedDeviceCount: new Set(
      [...clients.values()].map((state) => state.deviceId).filter(Boolean)
    ).size,
  };
}

// A closed connection returns a failure state while the
// broadcast loop continues processing other devices.
function send(socket, type, payload = {}) {
  if (socket.readyState !== WebSocket.OPEN) return false;
  socket.send(JSON.stringify({ type, ...payload }));
  return true;
}

// Send the same aggregated world back to every device,
// allowing participants' attention to affect the shared ecology across connected instances.
function broadcastWorld(world) {
  const message = JSON.stringify({
    type: "world",
    world: { ...world, authority: authority() },
  });
  for (const socket of clients.keys()) {
    if (socket.readyState === WebSocket.OPEN) socket.send(message);
  }
}

const serveStatic = createStaticResponder({
  root,
  allowSourceMaps: process.env.NODE_ENV !== "production",
  cacheControl: (filePath) => path.basename(filePath) === "index.html"
    ? "no-cache"
    : "public, max-age=3600",
  notFound: (response) => json(response, 404, { error: "not-found" }),
  invalidPath: (response) => json(response, 400, { error: "invalid-path" }),
});

// This code was modified with the assistance of ChatGPT.
const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
  try {
    if (request.method === "OPTIONS") {
      json(response, 204, {});
      return;
    }
    if (url.pathname === "/health") {
      json(response, 200, { ok: true });
      return;
    }
    if (url.pathname === "/api/world" && request.method === "GET") {
      json(response, 200, { world: await db.loadWorld(authority()) });
      return;
    }
    if (url.pathname === "/api/events" && request.method === "POST") {
      const body = await readBody(request);
      const deviceId = safeId(body.deviceId);
      const eventId = safeId(body.eventId);
      if (!deviceId || !eventId) {
        json(response, 400, { error: "invalid-id" });
        return;
      }
      const world = await db.contribute(
        {
          ...body,
          deviceId,
          eventId,
          eventType: safeId(body.eventType, 80) || "ecology.change",
        },
        authority()
      );
      broadcastWorld(world);
      json(response, 200, { world });
      return;
    }
    if (url.pathname === "/api/admin/log/export" && request.method === "GET") {
      if (!hasAdminAccess(request)) {
        json(response, 403, { error: "forbidden" });
        return;
      }
      const rawFrom = url.searchParams.get("from");
      const rawTo = url.searchParams.get("to");
      const from = safeTimestamp(rawFrom);
      const to = safeTimestamp(rawTo);
      if ((rawFrom && !from) || (rawTo && !to)) {
        json(response, 400, { error: "invalid-time-range" });
        return;
      }
      const cycleId = Math.max(0, Math.floor(Number(url.searchParams.get("cycle")) || 0));
      const afterSequence = Math.max(0, Math.floor(Number(url.searchParams.get("after")) || 0));
      const throughSequence = Math.max(0, Math.floor(Number(url.searchParams.get("through")) || 0));
      const limit = Math.max(1, Math.floor(Number(url.searchParams.get("limit")) || 5000));
      json(response, 200, await db.exportEcologyLog(
        {
          from,
          to,
          cycleId: cycleId || null,
          afterSequence: afterSequence || null,
          throughSequence: throughSequence || null,
          limit,
        },
        authority()
      ));
      return;
    }
    if (url.pathname === "/api/admin/reset" && request.method === "POST") {
      if (!hasAdminAccess(request)) {
        json(response, 403, { error: "forbidden" });
        return;
      }
      const world = await db.clearWorld();
      broadcastWorld(world);
      json(response, 200, { world });
      return;
    }
    if (request.method === "GET" || request.method === "HEAD") {
      serveStatic(response, url.pathname);
      return;
    }
    json(response, 404, { error: "not-found" });
  } catch (error) {
    console.error("[shared-ecology] request failed", error);
    json(response, 500, { error: "server-error" });
  }
});

const websocketServer = new WebSocketServer({ noServer: true });

server.on("upgrade", (request, socket, head) => {
  const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
  if (url.pathname !== "/ws") {
    socket.destroy();
    return;
  }
  websocketServer.handleUpgrade(request, socket, head, (websocket) => {
    websocketServer.emit("connection", websocket, request);
  });
});

// This code was modified with the assistance of ChatGPT.
websocketServer.on("connection", (socket) => {
  const state = {
    sequence: ++connectionSequence,
    deviceId: null,
    messageWindowAt: Date.now(),
    messageCount: 0,
  };
  clients.set(socket, state);
  socket.on("message", async (raw) => {
    try {
      const now = Date.now();
      if (now - state.messageWindowAt > 10000) {
        state.messageWindowAt = now;
        state.messageCount = 0;
      }
      state.messageCount++;
      if (state.messageCount > 40 || raw.length > 65536) {
        socket.close(1008, "rate-limit");
        return;
      }
      const message = JSON.parse(raw.toString());
      if (message.type === "hello") {
        const deviceId = safeId(message.deviceId);
        if (!deviceId) {
          socket.close(1008, "invalid-device");
          return;
        }
        state.deviceId = deviceId;
        const world = await db.hello(
          {
            deviceId,
            presentCount: message.presentCount,
            bootstrap: message.bootstrap,
          },
          authority()
        );
        broadcastWorld(world);
        return;
      }
      if (!state.deviceId || message.deviceId !== state.deviceId) return;
      if (message.type === "heartbeat") {
        await db.heartbeat(message);
        send(socket, "heartbeat.ack", { at: new Date().toISOString() });
        return;
      }
      if (message.type === "log-event") {
        const eventId = safeId(message.eventId);
        const eventType = safeId(message.eventType, 80);
        const primarySpecies = String(message.primarySpecies || "");
        if (!eventId || !eventType || !logSpecies.has(primarySpecies)) return;
        await db.recordInteraction({
          eventId,
          eventType,
          primarySpecies,
          deviceId: state.deviceId,
          presentCount: message.presentCount,
        });
        send(socket, "contribution.ack", { eventId });
        return;
      }
      if (message.type === "contribution") {
        const eventId = safeId(message.eventId);
        if (!eventId) return;
        const world = await db.contribute(
          {
            ...message,
            eventId,
            deviceId: state.deviceId,
            eventType: safeId(message.eventType, 80) || "ecology.change",
          },
          authority()
        );
        send(socket, "contribution.ack", { eventId });
        broadcastWorld(world);
      }
    } catch (error) {
      console.error("[shared-ecology] websocket message failed", error);
      send(socket, "error", { message: "message-failed" });
    }
  });
  socket.on("close", () => {
    clients.delete(socket);
    const nextAuthority = authority();
    const message = JSON.stringify({ type: "authority", authority: nextAuthority });
    for (const peer of clients.keys()) {
      if (peer.readyState === WebSocket.OPEN) peer.send(message);
    }
  });
});

// Prepare the structure of ecological memory before the service accepts connections.
async function start() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }
  await db.migrate();
  historyPruneTimer = setInterval(() => {
    db.pruneEcologyHistory().catch((error) => {
      console.error("[shared-ecology] history cleanup failed", error);
    });
  }, 6 * 60 * 60 * 1000);
  historyPruneTimer.unref?.();
  server.listen(port, "0.0.0.0", () => {
    console.log(`[shared-ecology] listening on ${port}`);
  });
}

start().catch((error) => {
  console.error("[shared-ecology] startup failed", error);
  process.exitCode = 1;
});

// Before the service shuts down, notify devices to seek a new connection,
// then close listener and database resources in sequence.
async function shutdown() {
  if (historyPruneTimer) clearInterval(historyPruneTimer);
  for (const socket of clients.keys()) socket.close(1012, "service-restart");
  server.close();
  await db.pool.end();
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
