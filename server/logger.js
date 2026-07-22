import fs from "fs";
import path from "path";

const LOG_DIR = path.join(process.cwd(), "server");
const LOG_FILE = path.join(LOG_DIR, "logs.txt");
const MAX_LOG_SIZE = 10 * 1024 * 1024; // 10 MB — rotate when exceeded

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function rotateIfNeeded() {
  try {
    if (fs.existsSync(LOG_FILE)) {
      const stats = fs.statSync(LOG_FILE);
      if (stats.size > MAX_LOG_SIZE) {
        const rotated = LOG_FILE.replace(".txt", `.${Date.now()}.txt`);
        fs.renameSync(LOG_FILE, rotated);
      }
    }
  } catch {
    // silent — don't block requests for log rotation failures
  }
}

function timestamp() {
  return new Date().toISOString();
}

function formatEntry(level, category, message, details = {}) {
  const detailStr = Object.keys(details).length
    ? " | " + Object.entries(details).map(([k, v]) => `${k}=${v}`).join(" | ")
    : "";
  return `[${timestamp()}] [${level}] [${category}]${detailStr} | ${message}\n`;
}

function appendLog(entry) {
  try {
    ensureLogDir();
    rotateIfNeeded();
    fs.appendFileSync(LOG_FILE, entry, "utf-8");
  } catch (err) {
    console.error("[server/logger] Failed to write log:", err.message);
  }
}

/**
 * Log an incoming request from a remote client.
 */
export function logRequest({ method, path, clientIp, sessionId, userAgent, upstreamUrl }) {
  const entry = formatEntry("INFO", "REQUEST", `${method} ${path} → ${upstreamUrl}`, {
    clientIp: clientIp || "unknown",
    sessionId: sessionId || "none",
    userAgent: userAgent ? userAgent.substring(0, 120) : "unknown",
  });
  appendLog(entry);
}

/**
 * Log a successful upstream response.
 */
export function logResponse({ method, path, status, durationMs }) {
  const entry = formatEntry("INFO", "RESPONSE", `${method} ${path} → ${status} (${durationMs}ms)`);
  appendLog(entry);
}

/**
 * Log an error, with special handling for connection refused.
 */
export function logError({ method, path, error, upstreamUrl, clientIp }) {
  const errMsg = error?.message || String(error);
  const errCode = error?.cause?.code || error?.code || "";

  let category = "ERROR";
  let message = `${method} ${path} | ${errMsg}`;

  // Detect connection refused specifically
  if (
    errCode === "ECONNREFUSED" ||
    errMsg.includes("ECONNREFUSED") ||
    errMsg.includes("connect ECONNREFUSED") ||
    errMsg.includes("fetch failed")
  ) {
    category = "CONNECTION_REFUSED";
    message = `${method} ${path} | Backend unreachable at ${upstreamUrl} — ${errMsg}`;
    if (errCode) message += ` (code: ${errCode})`;
  }

  const entry = formatEntry("ERROR", category, message, {
    clientIp: clientIp || "unknown",
    upstream: upstreamUrl || "unknown",
  });
  appendLog(entry);
}

/**
 * Extract client IP from the request headers.
 */
export function getClientIp(req) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    req.headers.get("cf-connecting-ip") ||
    "unknown"
  );
}
