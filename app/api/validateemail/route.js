import { NextResponse } from 'next/server';
import { getFastApiConfig } from '../../../lib/getSecret.js';

export async function POST(req) {
  try {
    const body = await req.json().catch(() => null);
    const { base, apiKey } = await getFastApiConfig(undefined, undefined, { requestHost: req.headers.get('host') || '' });

    if (!base) {
      return NextResponse.json(
        { error: 'FastAPI base not configured' },
        { status: 500 }
      );
    }

    const apiName = 'validateemail';
    const url = `${base.replace(/\/$/, '')}/${apiName}`;

    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) {
      headers['x-api-key'] = apiKey;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body || {}),
      cache: 'no-store',
    });

    const text = await response.text();
    return new NextResponse(text, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('content-type') || 'application/json',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || 'Unable to reach FastAPI' },
      { status: 502 }
    );
  }
}
