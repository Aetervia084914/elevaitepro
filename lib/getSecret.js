import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

let cache = null;
let cachedAt = 0;
const TTL = 60 * 1000;

function isLocalRequestHost(host) {
  if (!host) return false;
  const normalized = String(host).toLowerCase().replace(/\[|\]/g, '');
  return /^(localhost|127\.0\.0\.1|0\.0\.0\.0|::1)/.test(normalized);
}

export async function readSecret(
  secretName = process.env.SECRET_NAME || 'elevaiteprosecret',
  region = process.env.AWS_REGION || 'eu-west-2'
) {
  const now = Date.now();
  if (cache && now - cachedAt < TTL) {
    return cache;
  }

  const client = new SecretsManagerClient({ region });
  const response = await client.send(
    new GetSecretValueCommand({ SecretId: secretName })
  );

  const secretString = response.SecretString || '';

  try {
    cache = JSON.parse(secretString);
  } catch {
    cache = secretString;
  }

  cachedAt = Date.now();
  return cache;
}

export async function getFastApiConfig(secretName, region, options = {}) {
  const requestHost = options.requestHost || process.env.REQUEST_HOST || '';
  const envBase = process.env.FASTAPI_BASE || process.env.FASTAPI_BASE_URL || process.env.FASTAPI_URL || process.env.NEXT_PUBLIC_FASTAPI_BASE_URL;
  const envApiKey = process.env.API_KEY || process.env.FASTAPI_API_KEY;

  if (isLocalRequestHost(requestHost)) {
    return {
      base: process.env.FASTAPI_LOCAL_BASE_URL || process.env.FASTAPI_LOCAL_URL || 'http://127.0.0.1:8002',
      apiKey: process.env.FASTAPI_LOCAL_API_KEY || envApiKey || null,
    };
  }

  if (envBase && envApiKey) {
    return { base: envBase, apiKey: envApiKey };
  }

  const secret = await readSecret(secretName, region);

  if (!secret) {
    throw new Error('Secret not found');
  }

  if (typeof secret === 'object' && secret !== null) {
    return {
      base: secret.FASTAPI_BASE || secret.FASTAPI_URL || secret.FASTAPI_BASE_URL || envBase || null,
      apiKey: secret.API_KEY || secret.api_key || secret.X_API_KEY || envApiKey || null,
    };
  }

  return {
    base: secret || envBase || null,
    apiKey: envApiKey || null,
  };
}
