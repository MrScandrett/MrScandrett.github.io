#!/usr/bin/env node
"use strict";

const crypto = require("crypto");

const input = process.argv[2];
if (!input) {
  console.error("Usage: node portal/hash_password.js \"YourPassword\"");
  process.exit(1);
}

const salt = crypto.randomBytes(16).toString("hex");
const hash = crypto.scryptSync(input, Buffer.from(salt, "hex"), 64).toString("hex");
console.log(`scrypt$${salt}$${hash}`);
