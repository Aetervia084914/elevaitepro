import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { NextResponse } from "next/server";
import { getFastApiConfig } from "../../../../lib/getSecret.js";
import { logRequest, logResponse, logError, getClientIp } from "../../../../server/logger.js";
import {
  logApiRequest,
  logApiResponse,
  logApiNetworkError,
} from "../../../../server/apiLogger.js";

function normalizeFastApiBaseUrl(baseUrl) {
  if (!baseUrl) return "http://127.0.0.1:8002";

  try {
    const parsed = new URL(String(baseUrl).trim());
    const path = (parsed.pathname || "/").replace(/\/+$/, "") || "/";

    const strippedPath = ["/api/fastapi", "/fastapi"]
      .reduce((currentPath, prefix) => {
        if (currentPath === prefix || currentPath.startsWith(`${prefix}/`)) {
          return currentPath.replace(prefix, "") || "/";
        }
        return currentPath;
      }, path);

    parsed.pathname = strippedPath || "/";
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return String(baseUrl).trim() || "http://127.0.0.1:8002";
  }
}

async function getFastApiBaseUrl(requestHost = "") {
  const localBase = process.env.FASTAPI_URL || process.env.FASTAPI_BASE_URL || process.env.NEXT_PUBLIC_FASTAPI_BASE_URL || "http://127.0.0.1:8002";

  try {
    const { base } = await getFastApiConfig(undefined, undefined, { requestHost });
    return normalizeFastApiBaseUrl(base || localBase);
  } catch {
    return normalizeFastApiBaseUrl(localBase);
  }
}

async function getFastApiUpstreamConfig(requestHost = "") {
  const localBase = process.env.FASTAPI_URL || process.env.FASTAPI_BASE_URL || process.env.NEXT_PUBLIC_FASTAPI_BASE_URL || "http://127.0.0.1:8002";

  try {
    const { base, apiKey } = await getFastApiConfig(undefined, undefined, { requestHost });
    return {
      base: normalizeFastApiBaseUrl(base || localBase),
      apiKey: apiKey || null,
    };
  } catch {
    return {
      base: normalizeFastApiBaseUrl(localBase),
      apiKey: null,
    };
  }
}

async function safeReadBody(req, method) {
  if (method === "GET" || method === "HEAD") return null;
  try {
    const buf = await req.arrayBuffer();
    return buf;
  } catch {
    return null;
  }
}

function bufferToString(buf) {
  if (!buf) return null;
  try {
    return new TextDecoder("utf-8").decode(buf);
  } catch {
    return `(binary data, ${buf.byteLength} bytes)`;
  }
}

function safeParseJson(str) {
  if (!str) return null;
  try {
    return JSON.parse(str);
  } catch {
    return str;
  }
}

async function proxy(req, ctx) {
  const requestHost = req.headers.get("host") || "";
  const { base: baseUrl, apiKey } = await getFastApiUpstreamConfig(requestHost);
  const resolvedParams = (await ctx?.params) || {};
  const pathParts = Array.isArray(resolvedParams?.path) ? resolvedParams.path : [];

  const upstreamUrl = new URL(pathParts.join("/"), baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);

  const incomingUrl = new URL(req.url);
  incomingUrl.searchParams.forEach((value, key) => {
    upstreamUrl.searchParams.set(key, value);
  });

  const headers = new Headers(req.headers);
  headers.delete("host");
  headers.delete("connection");
  headers.delete("keep-alive");
  headers.delete("transfer-encoding");
  headers.delete("content-length");

  const safeHeaderNames = [
    "content-type",
    "accept",
    "accept-language",
    "x-session-id",
    "user-agent",
    "authorization",
    "x-forwarded-for",
    "x-real-ip",
    "cf-connecting-ip",
  ];

  // Read request body once (we need length for Content-Length)
  const method = req.method?.toUpperCase() || "GET";
  const bodyBuffer = await safeReadBody(req, method);
  const bodyString = bufferToString(bodyBuffer);
  const bodyForLog = safeParseJson(bodyString);

  // Build upstream headers from a safe whitelist and include API key if present
  const upstreamHeaders = {};
  safeHeaderNames.forEach((name) => {
    const value = headers.get(name);
    if (value) upstreamHeaders[name] = value;
  });
  if (apiKey) {
    upstreamHeaders["x-api-key"] = apiKey;
  }

  // If we have a body, set Content-Length explicitly (avoid chunked transfer)
  if (bodyBuffer && method !== "GET" && method !== "HEAD") {
    try {
      const nodeBuf = Buffer.from(bodyBuffer);
      upstreamHeaders["content-length"] = String(nodeBuf.length);
      // prefer closing the connection to avoid keep-alive surprises in dev
      upstreamHeaders["connection"] = "close";
    } catch (e) {
      // ignore and proceed without content-length
    }
  }

  const reqPath = "/" + pathParts.join("/");
  const clientIp = getClientIp(req);
  const sessionId = headers.get("x-session-id") || "";
  const userAgent = headers.get("user-agent") || "";

  // Log incoming request (existing logger)
  logRequest({ method, path: reqPath, clientIp, sessionId, userAgent, upstreamUrl: upstreamUrl.toString() });

  // Log detailed request to log/logs.txt
  logApiRequest({
    method,
    path: reqPath,
    upstreamUrl: upstreamUrl.toString(),
    clientIp,
    sessionId,
    requestBody: bodyForLog,
    requestHeaders: headers,
    upstreamRequestHeaders: upstreamHeaders,
  });

  const startTime = Date.now();

  const upstreamRequestOptions = {
    protocol: upstreamUrl.protocol,
    hostname: upstreamUrl.hostname,
    port: upstreamUrl.port || (upstreamUrl.protocol === "https:" ? 443 : 80),
    path: `${upstreamUrl.pathname}${upstreamUrl.search}`,
    method,
    headers: upstreamHeaders,
  };

  // Retry loop for transient connection errors (ECONNRESET / socket hang up)
  const maxAttempts = 2;
  let attempt = 0;
  try {
    let upstreamResponse;
    for (; attempt < maxAttempts; attempt++) {
      try {
        upstreamResponse = await new Promise((resolve, reject) => {
          const client = upstreamUrl.protocol === "https:" ? httpsRequest : httpRequest;
          const upstreamReq = client(upstreamRequestOptions, (res) => {
            const chunks = [];
            res.on("data", (chunk) => {
              chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            });
            res.on("end", () => {
              resolve({
                status: res.statusCode || 502,
                statusText: res.statusMessage || "",
                headers: res.headers,
                body: Buffer.concat(chunks),
              });
            });
          });

          upstreamReq.on("error", reject);

          if (bodyBuffer && method !== "GET" && method !== "HEAD") {
            upstreamReq.write(Buffer.from(bodyBuffer));
          }

          upstreamReq.end();
        });

        // success
        break;
      } catch (err) {
        const msg = String(err?.message || err);
        const code = err?.code || err?.cause?.code || "";
        const retryable = msg.includes("socket hang up") || msg.includes("ECONNRESET") || msg.includes("fetch failed") || code === "ECONNRESET" || code === "ECONNREFUSED" || msg.includes("invalid transfer-encoding");
        if (retryable && attempt < maxAttempts - 1) {
          // small backoff
          await new Promise((r) => setTimeout(r, 100 * (attempt + 1)));
          continue;
        }
        throw err;
      }
    }

    const durationMs = Date.now() - startTime;

    // Log response (existing logger)
    logResponse({ method, path: reqPath, status: upstreamResponse.status, durationMs });

    const responseHeaders = new Headers(upstreamResponse.headers);
    responseHeaders.delete("content-encoding");
    responseHeaders.delete("content-length");

    const responseBodyBuffer = Buffer.isBuffer(upstreamResponse.body)
      ? upstreamResponse.body
      : Buffer.from(upstreamResponse.body || "");

    // For error responses (status >= 400), read the body to log it
    if (upstreamResponse.status >= 400) {
      const responseBodyText = responseBodyBuffer.toString("utf8");
      const responseBodyForLog = safeParseJson(responseBodyText);

      // Log detailed error response to log/logs.txt
      logApiResponse({
        method,
        path: reqPath,
        upstreamUrl: upstreamUrl.toString(),
        status: upstreamResponse.status,
        statusText: upstreamResponse.statusText,
        durationMs,
        responseHeaders: upstreamResponse.headers,
        responseBody: responseBodyForLog,
      });

      return new NextResponse(responseBodyText, {
        status: upstreamResponse.status,
        headers: responseHeaders,
      });
    }

    // For success responses, capture and log the body as well
    const responseBodyText = responseBodyBuffer.toString("utf8");
    const responseBodyForLog = safeParseJson(responseBodyText);

    logApiResponse({
      method,
      path: reqPath,
      upstreamUrl: upstreamUrl.toString(),
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      durationMs,
      responseHeaders: upstreamResponse.headers,
      responseBody: responseBodyForLog,
      upstreamRequestHeaders: upstreamHeaders,
    });

    return new NextResponse(responseBodyBuffer, {
      status: upstreamResponse.status,
      headers: responseHeaders,
    });
  } catch (error) {
    const durationMs = Date.now() - startTime;

    // Log error (existing logger)
    logError({ method, path: reqPath, error, upstreamUrl: upstreamUrl.toString(), clientIp });

    // Log detailed network error to log/logs.txt
    logApiNetworkError({
      method,
      path: reqPath,
      upstreamUrl: upstreamUrl.toString(),
      error,
      durationMs,
      clientIp,
      requestBody: bodyForLog,
    });

    const errMsg = error?.message || String(error);
    const errCode = error?.cause?.code || error?.code || "";
    const isConnRefused =
      errMsg.includes("ECONNREFUSED") ||
      errMsg.includes("fetch failed") ||
      errCode === "ECONNREFUSED";

    return NextResponse.json(
      {
        error: isConnRefused
          ? "Backend service unavailable. Connection refused."
          : "Proxy error. Please try again.",
        detail: errMsg,
        upstream: upstreamUrl.toString(),
        durationMs,
        errorCode: errCode || undefined,
        causeMessage: error?.cause?.message || undefined,
        causeAddress: error?.cause?.address || undefined,
        causePort: error?.cause?.port || undefined,
      },
      { status: isConnRefused ? 503 : 502 }
    );
  }
}

export async function GET(req, ctx) {
  return proxy(req, ctx);
}

export async function POST(req, ctx) {
  return proxy(req, ctx);
}

export async function PUT(req, ctx) {
  return proxy(req, ctx);
}

export async function PATCH(req, ctx) {
  return proxy(req, ctx);
}

export async function DELETE(req, ctx) {
  return proxy(req, ctx);
}

export async function OPTIONS(req, ctx) {
  return proxy(req, ctx);
}
