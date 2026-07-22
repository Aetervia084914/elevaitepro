import { NextResponse } from "next/server";
import { getFastApiConfig } from "../../../lib/getSecret.js";
import {
  logApiRequest,
  logApiResponse,
  logApiNetworkError,
} from "../../../server/apiLogger.js";

function normalizeFastApiBaseUrl(baseUrl) {
  if (!baseUrl) return "http://127.0.0.1:8002";
  try {
    const parsed = new URL(String(baseUrl).trim());
    const normalizedPath = (parsed.pathname || "/").replace(/\/+$/, "") || "/";
    parsed.pathname = normalizedPath;
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return String(baseUrl).trim() || "http://127.0.0.1:8002";
  }
}

async function getFastApiBaseUrl() {
  const localBase = process.env.FASTAPI_URL || process.env.FASTAPI_BASE_URL || process.env.NEXT_PUBLIC_FASTAPI_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8002";

  try {
    const { base, apiKey } = await getFastApiConfig(undefined, undefined, { requestHost: "" });
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

function sanitizeFilename(value) {
  return String(value || "Summary")
    .replace(/[^a-z0-9_-]+/gi, "_")
    .replace(/^_+|_+$/g, "") || "Summary";
}

export async function POST(req) {
  const payload = await req.json().catch(() => null);

  if (!payload || typeof payload !== "object") {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const { base: baseUrl, apiKey } = await getFastApiBaseUrl();
  const upstreamUrl = new URL("/generatesummarypdf", baseUrl);
  const headers = new Headers({
    "Content-Type": "application/json",
    Accept: "application/pdf",
  });
  if (apiKey) headers.set("x-api-key", apiKey);

  const sessionId = req.headers.get("x-session-id");
  if (sessionId) headers.set("x-session-id", sessionId);

  const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || req.headers.get("x-real-ip") || "unknown";

  logApiRequest({
    method: "POST",
    path: "/generatesummarypdf",
    upstreamUrl: upstreamUrl.toString(),
    clientIp,
    sessionId: sessionId || "none",
    requestBody: payload,
    requestHeaders: headers,
  });

  const startTime = Date.now();

  try {
    const upstreamResponse = await fetch(upstreamUrl.toString(), {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const durationMs = Date.now() - startTime;

    if (!upstreamResponse.ok) {
      let errorBodyText = "";
      try {
        errorBodyText = await upstreamResponse.text();
      } catch {
        errorBodyText = "(could not read error response body)";
      }

      let errorBodyParsed;
      try {
        errorBodyParsed = JSON.parse(errorBodyText);
      } catch {
        errorBodyParsed = errorBodyText;
      }

      logApiResponse({
        method: "POST",
        path: "/generatesummarypdf",
        upstreamUrl: upstreamUrl.toString(),
        status: upstreamResponse.status,
        statusText: upstreamResponse.statusText,
        durationMs,
        responseHeaders: upstreamResponse.headers,
        responseBody: errorBodyParsed,
      });

      return NextResponse.json(
        {
          error: "Summary PDF generation failed",
          detail: errorBodyParsed?.detail || errorBodyParsed?.error || upstreamResponse.statusText,
          status: upstreamResponse.status,
          upstreamResponse: errorBodyParsed,
        },
        { status: upstreamResponse.status }
      );
    }

    logApiResponse({
      method: "POST",
      path: "/generatesummarypdf",
      upstreamUrl: upstreamUrl.toString(),
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      durationMs,
      responseHeaders: upstreamResponse.headers,
      responseBody: null,
    });

    const responseHeaders = new Headers(upstreamResponse.headers);
    responseHeaders.delete("content-encoding");
    responseHeaders.delete("content-length");
    responseHeaders.set("Content-Type", "application/pdf");

    if (!responseHeaders.has("Content-Disposition")) {
      const safeName = sanitizeFilename(payload.career_goal);
      responseHeaders.set(
        "Content-Disposition",
        `attachment; filename="${safeName}_Summary.pdf"`
      );
    }

    return new NextResponse(upstreamResponse.body, {
      status: upstreamResponse.status,
      headers: responseHeaders,
    });
  } catch (error) {
    const durationMs = Date.now() - startTime;

    logApiNetworkError({
      method: "POST",
      path: "/generatesummarypdf",
      upstreamUrl: upstreamUrl.toString(),
      error,
      durationMs,
      clientIp,
      requestBody: payload,
    });

    return NextResponse.json(
      {
        error: "Backend service unavailable",
        detail: error?.message || String(error),
        errorCode: error?.cause?.code || error?.code || undefined,
      },
      { status: 503 }
    );
  }
}
