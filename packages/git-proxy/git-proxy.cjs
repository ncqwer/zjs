#!/usr/bin/env node
import("./git-proxy.js").catch((err) => {
  console.error(err?.stack || String(err));
  process.exit(1);
});
