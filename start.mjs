/**
 * Production startup script for the Next.js frontend.
 *
 * 1. Loads configuration from AWS Secrets Manager into process.env
 * 2. Starts the Next.js production server
 *
 * Usage:  node start.mjs
 *
 * Requires: npm run build  (must be run first with env vars available,
 *           e.g. via a build script that also calls loadSecrets)
 */

import { loadSecrets } from "./lib/aws-config.mjs";

await loadSecrets();

const { default: next } = await import("next");
const { createServer } = await import("http");

const app = next({ dev: false });
const handle = app.getRequestHandler();

await app.prepare();

const port = parseInt(process.env.PORT || "3000", 10);
const host = process.env.HOST || "0.0.0.0";

const server = createServer((req, res) => handle(req, res));

server.listen(port, host, () => {
  console.log(`Next.js production server running on http://${host}:${port}`);
});
