import fs from "fs";
import path from "path";

const LOG_DIR = path.join(process.cwd(), "log");
const LOG_FILE = path.join(LOG_DIR, "logs.txt");
const MAX_LOG_SIZE = 10 * 1024 * 1024;
const MAX_BODY_LOG_LENGTH = 5000;

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
    // silent
  }
}

function appendLog(entry) {
  try {
    ensureLogDir();
    rotateIfNeeded();
    fs.appendFileSync(LOG_FILE, entry, "utf-8");
  } catch (err) {
    console.error("[apiLogger] Failed to write log:", err.message);
  }
}

function ts() {
  return new Date().toISOString();
}

function truncateBody(body) {
  if (!body) return "(empty)";
  const str = typeof body === "string" ? body : JSON.stringify(body, null, 2);
  if (str.length > MAX_BODY_LOG_LENGTH) {
    return str.slice(0, MAX_BODY_LOG_LENGTH) + `\n... [TRUNCATED - total ${str.length} chars]`;
  }
  return str;
}

function safeStringify(obj) {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(obj);
  }
}

function headersToObject(headers) {
  if (!headers) return {};
  const obj = {};
  if (typeof headers.forEach === "function") {
    headers.forEach((value, key) => {
      const lower = key.toLowerCase();
      if (lower === "authorization" || lower === "cookie") {
        obj[key] = "[REDACTED]";
      } else {
        obj[key] = value;
      }
    });
  }
  return obj;
}

const SEPARATOR = "─".repeat(90);

export function logApiRequest({ method, path: reqPath, upstreamUrl, clientIp, sessionId, requestBody, requestHeaders }) {
  const bodyStr = requestBody ? truncateBody(requestBody) : "(no body)";
  const headersStr = requestHeaders ? safeStringify(headersToObject(requestHeaders)) : "{}";

  const entry = `
${SEPARATOR}
[${ts()}] >>> FASTAPI REQUEST
${SEPARATOR}
  Method       : ${method}
  Proxy Path   : ${reqPath}
  Upstream URL : ${upstreamUrl}
  Client IP    : ${clientIp || "unknown"}
  Session ID   : ${sessionId || "none"}
  Request Headers:
${headersStr}
  Request Body:
${bodyStr}
`;
  appendLog(entry);
}

export function logApiResponse({ method, path: reqPath, upstreamUrl, status, statusText, durationMs, responseHeaders, responseBody }) {
  const headersStr = responseHeaders ? safeStringify(headersToObject(responseHeaders)) : "{}";
  const bodyStr = responseBody ? truncateBody(responseBody) : "(not captured)";
  const isError = status >= 400;
  const tag = isError ? "FASTAPI ERROR RESPONSE" : "FASTAPI RESPONSE";

  const entry = `
${SEPARATOR}
[${ts()}] <<< ${tag} [${status} ${statusText || ""}]
${SEPARATOR}
  Method       : ${method}
  Proxy Path   : ${reqPath}
  Upstream URL : ${upstreamUrl}
  Status       : ${status} ${statusText || ""}
  Duration     : ${durationMs}ms
  Response Headers:
${headersStr}
  Response Body:
${bodyStr}
`;
  appendLog(entry);
}

export function logApiNetworkError({ method, path: reqPath, upstreamUrl, error, durationMs, clientIp, requestBody }) {
  const errMsg = error?.message || String(error);
  const errCode = error?.cause?.code || error?.code || "(none)";
  const errName = error?.name || "(unknown)";
  const errStack = error?.stack || "(no stack trace)";

  const causeMsg = error?.cause?.message || "(no cause message)";
  const causeCode = error?.cause?.code || "(no cause code)";
  const causeAddress = error?.cause?.address || "(no address)";
  const causePort = error?.cause?.port || "(no port)";
  const causeSyscall = error?.cause?.syscall || "(no syscall)";

  const isConnRefused =
    errCode === "ECONNREFUSED" ||
    causeCode === "ECONNREFUSED" ||
    errMsg.includes("ECONNREFUSED") ||
    errMsg.includes("fetch failed");

  const isTimeout =
    errCode === "ETIMEDOUT" ||
    causeCode === "ETIMEDOUT" ||
    errMsg.includes("ETIMEDOUT") ||
    errMsg.includes("timeout");

  const isDnsError =
    errCode === "ENOTFOUND" ||
    causeCode === "ENOTFOUND" ||
    errMsg.includes("ENOTFOUND");

  const isConnReset =
    errCode === "ECONNRESET" ||
    causeCode === "ECONNRESET" ||
    errMsg.includes("ECONNRESET");

  let errorType = "UNKNOWN_NETWORK_ERROR";
  if (isConnRefused) errorType = "CONNECTION_REFUSED";
  else if (isTimeout) errorType = "CONNECTION_TIMEOUT";
  else if (isDnsError) errorType = "DNS_RESOLUTION_FAILED";
  else if (isConnReset) errorType = "CONNECTION_RESET";

  const bodyStr = requestBody ? truncateBody(requestBody) : "(no body)";

  const entry = `
${SEPARATOR}
[${ts()}] !!! FASTAPI NETWORK ERROR [${errorType}]
${SEPARATOR}
  Method       : ${method}
  Proxy Path   : ${reqPath}
  Upstream URL : ${upstreamUrl}
  Client IP    : ${clientIp || "unknown"}
  Duration     : ${durationMs}ms
  Error Type   : ${errorType}
  Error Name   : ${errName}
  Error Message: ${errMsg}
  Error Code   : ${errCode}
  Cause Message: ${causeMsg}
  Cause Code   : ${causeCode}
  Cause Address: ${causeAddress}
  Cause Port   : ${causePort}
  Cause Syscall: ${causeSyscall}
  Stack Trace  :
${errStack}
  Request Body Sent:
${bodyStr}
`;
  appendLog(entry);
}
