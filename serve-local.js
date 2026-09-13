#!/usr/bin/env node
"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");

const root = __dirname;
const port = Number(process.env.PORT || 8080);
const host = process.env.HOST || "127.0.0.1";
const editorPassword = process.env.ADMIN_PASS || "";
const maxSaveBytes = 2 * 1024 * 1024;
const editableExtension = /\.(html|css|js|mjs|json|md)$/i;
const imageExtension = /\.(png|jpe?g|gif|svg|webp|avif)$/i;
const ignoredEditorDirectories = new Set(["node_modules", ".git", "apps", "dist", ".vscode"]);

function findFiles(dir, pattern) {
  let results = [];
  try {
    const list = fs.readdirSync(dir, { withFileTypes: true });
    list.forEach((entry) => {
      const file = entry.name;
      const absolutePath = path.join(dir, file);
      if (entry.isSymbolicLink()) return;
      if (entry.isDirectory()) {
        if (!ignoredEditorDirectories.has(file)) {
          results = results.concat(findFiles(absolutePath, pattern));
        }
      } else if (entry.isFile() && pattern.test(file)) {
        results.push(`/${path.relative(root, absolutePath).replace(/\\/g, "/")}`);
      }
    });
  } catch (error) {
    console.error(`Could not index ${dir}:`, error.message);
  }
  return results;
}

const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

http
  .createServer((req, res) => {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, Range",
      "Access-Control-Allow-Private-Network": "true",
    };

    if (req.method === "OPTIONS") {
      res.writeHead(204, corsHeaders);
      res.end();
      return;
    }

    const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
    const normalized = path.normalize(urlPath).replace(/^([.][.][/\\])+/, "");
    let filePath = path.join(root, normalized);
    if (urlPath === "/") filePath = path.join(root, "index.html");

    // OSeditor is intentionally a local-development tool. Saving is disabled
    // unless ADMIN_PASS is explicitly set when the server starts.
    if (urlPath === "/api/editor-config" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
      res.end(JSON.stringify({ saveEnabled: Boolean(editorPassword) }));
      return;
    }

    if (urlPath === "/api/files" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
      res.end(JSON.stringify(findFiles(root, editableExtension).sort()));
      return;
    }

    if (urlPath === "/api/assets" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
      res.end(JSON.stringify(findFiles(root, imageExtension).sort()));
      return;
    }

    if (urlPath === "/api/save" && req.method === "POST") {
      if (!editorPassword) {
        res.writeHead(503, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Server saving is disabled. Restart with ADMIN_PASS set.");
        return;
      }

      const requestOrigin = req.headers.origin;
      if (requestOrigin) {
        let sameOrigin = false;
        try {
          sameOrigin = new URL(requestOrigin).host === req.headers.host;
        } catch {
          sameOrigin = false;
        }
        if (!sameOrigin) {
          res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
          res.end("Cross-origin saves are forbidden");
          return;
        }
      }

      let body = "";
      let tooLarge = false;
      req.on("data", (chunk) => {
        if (tooLarge) return;
        body += chunk.toString();
        if (Buffer.byteLength(body) > maxSaveBytes) {
          tooLarge = true;
          res.writeHead(413, { "Content-Type": "text/plain; charset=utf-8" });
          res.end("File is too large to save.");
          req.destroy();
        }
      });
      req.on("end", () => {
        if (tooLarge) return;
        try {
          const data = JSON.parse(body);
          if (typeof data.password !== "string" || data.password !== editorPassword) {
            res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
            res.end("Forbidden: Incorrect Password");
            return;
          }

          if (typeof data.path !== "string" || typeof data.content !== "string" || !editableExtension.test(data.path)) {
            res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
            res.end("Invalid file data");
            return;
          }

          const requestedPath = data.path.replace(/^[/\\]+/, "");
          const targetPath = path.resolve(root, requestedPath);
          const rootPrefix = `${fs.realpathSync(root)}${path.sep}`;
          let realTarget;
          try {
            realTarget = fs.realpathSync(targetPath);
          } catch {
            res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
            res.end("File does not exist");
            return;
          }

          if (!realTarget.startsWith(rootPrefix) || !fs.statSync(realTarget).isFile()) {
            res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
            res.end("Forbidden path");
            return;
          }

          const relativeParts = path.relative(root, realTarget).split(path.sep);
          if (relativeParts.some((part) => ignoredEditorDirectories.has(part))) {
            res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
            res.end("This generated or private path is read-only");
            return;
          }

          fs.writeFileSync(realTarget, data.content, "utf8");
          res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" });
          res.end("Saved");
        } catch (error) {
          console.error("OSeditor save failed:", error.message);
          res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
          res.end("Invalid save request");
        }
      });
      return;
    }

    if (urlPath.startsWith("/api/")) {
      res.writeHead(405, { "Content-Type": "text/plain; charset=utf-8", Allow: "GET, POST, OPTIONS" });
      res.end("Method not allowed");
      return;
    }

    if (!filePath.startsWith(root)) {
      res.writeHead(403, corsHeaders);
      res.end("Forbidden");
      return;
    }

    fs.stat(filePath, (err, stat) => {
      if (err) {
        res.writeHead(404, corsHeaders);
        res.end("Not Found");
        return;
      }

      if (stat.isDirectory()) {
        const indexFile = path.join(filePath, "index.html");
        fs.readFile(indexFile, (indexErr, data) => {
          if (indexErr) {
            res.writeHead(404, corsHeaders);
            res.end("Not Found");
            return;
          }
          res.writeHead(200, { ...corsHeaders, "Content-Type": mime[".html"] });
          res.end(data);
        });
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { ...corsHeaders, "Content-Type": mime[ext] || "application/octet-stream" });
      fs.createReadStream(filePath).pipe(res);
    });
  })
  .listen(port, host, () => {
    console.log(`Local server running at http://${host}:${port}`);
    if (!editorPassword) console.log("OSeditor server saving is disabled; set ADMIN_PASS to enable it.");
  });
