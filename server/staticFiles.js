// File Overview
// Serves project files through validated paths, MIME types, and cache policies.

"use strict";

const fs = require("node:fs");
const path = require("node:path");

const mime = Object.freeze({
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".map": "application/json; charset=utf-8",
  ".ttf": "font/ttf",
});

// Static serving exposes the entry point, generated assets,
// and local dependencies required to run the work.
const publicRootFiles = new Set(["index.html", "app.js"]);
const publicDirectories = new Set(["dist", "vendor"]);
const publicExtensions = new Set([
  ".js",
  ".css",
  ".gif",
  ".jpeg",
  ".jpg",
  ".mp3",
  ".map",
  ".ogg",
  ".png",
  ".svg",
  ".ttf",
  ".wav",
  ".webp",
  ".woff",
  ".woff2",
]);

// Entry files are allowed by name, while directory assets are validated by directory and extension;
// source maps can be disabled by runtime mode.
function isPublicAsset(relativePath, { allowSourceMaps = true } = {}) {
  const normalized = String(relativePath || "").replace(/\\/g, "/");
  if (publicRootFiles.has(normalized)) return true;
  const separatorIndex = normalized.indexOf("/");
  if (separatorIndex <= 0) return false;
  const directory = normalized.slice(0, separatorIndex);
  const extension = path.posix.extname(normalized).toLowerCase();
  if (!allowSourceMaps && extension === ".map") return false;
  return publicDirectories.has(directory) && publicExtensions.has(extension);
}

// This function was modified with the assistance of ChatGPT.
function createStaticResponder({
  root,
  cacheControl = () => "no-store",
  notFound,
  invalidPath = notFound,
  allowSourceMaps = true,
}) {
  const projectRoot = path.resolve(root);

  // The decoded path must remain within the project root and belong to the public allowlist.
  return function serveStatic(response, urlPathname) {
    let pathname;
    try {
      pathname = decodeURIComponent(urlPathname === "/" ? "/index.html" : urlPathname);
    } catch (error) {
      invalidPath(response, error);
      return;
    }

    const filePath = path.resolve(projectRoot, `.${pathname}`);
    const relative = path.relative(projectRoot, filePath);
    if (
      relative.startsWith("..") ||
      path.isAbsolute(relative) ||
      !isPublicAsset(relative, { allowSourceMaps })
    ) {
      notFound(response);
      return;
    }

    fs.stat(filePath, (error, stat) => {
      if (error || !stat.isFile()) {
        notFound(response);
        return;
      }
      response.writeHead(200, {
        "content-type": mime[path.extname(filePath).toLowerCase()] ||
          "application/octet-stream",
        "cache-control": cacheControl(filePath),
      });
      fs.createReadStream(filePath).pipe(response);
    });
  };
}

module.exports = { createStaticResponder, isPublicAsset };
