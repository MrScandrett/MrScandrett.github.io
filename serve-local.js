#!/usr/bin/env node
"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");

const root = __dirname;
const port = Number(process.env.PORT || 8080);

const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
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
      "Access-Control-Allow-Methods": "GET,HEAD,OPTIONS",
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
  .listen(port, () => {
    console.log(`Local server running at http://localhost:${port}`);
  });
