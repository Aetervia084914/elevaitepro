/**
 * Server-side AWS Secrets Manager loader for the Next.js frontend.
 *
 * Fetches the application secret once at startup, injects relevant keys
 * into process.env, and caches the result in memory.
 *
 * This module must NEVER be imported from client-side code.
 */

import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";

const SECRET_NAME = "elevaiteprosecret";
const AWS_REGION = "eu-west-2";

const NEXTJS_KEYS = [
  "FASTAPI_URL",
  "FASTAPI_BASE_URL",
  "NEXT_PUBLIC_FASTAPI_BASE_URL",
];

let _cache = null;

/**
 * Fetch secrets from AWS Secrets Manager and inject the Next.js-relevant
 * keys into process.env.  Subsequent calls return the cached result.
 *
 * Exits the process with code 1 if the secret cannot be retrieved.
 */
export async function loadSecrets() {
  if (_cache) return _cache;

  const client = new SecretsManagerClient({ region: AWS_REGION });

  let secretString;
  try {
    const response = await client.send(
      new GetSecretValueCommand({ SecretId: SECRET_NAME })
    );
    secretString = response.SecretString;
  } catch (err) {
    console.error(
      `[FATAL] Failed to retrieve secret '${SECRET_NAME}' from AWS Secrets Manager:`,
      err.message
    );
    process.exit(1);
  }

  let secrets;
  try {
    secrets = JSON.parse(secretString);
  } catch (err) {
    console.error(
      `[FATAL] Secret '${SECRET_NAME}' is not valid JSON:`,
      err.message
    );
    process.exit(1);
  }

  for (const key of NEXTJS_KEYS) {
    if (secrets[key] !== undefined) {
      process.env[key] = secrets[key];
    }
  }

  if (secrets.FASTAPI_URL !== undefined) {
    process.env.FASTAPI_BASE_URL = secrets.FASTAPI_URL;
    process.env.NEXT_PUBLIC_FASTAPI_BASE_URL = secrets.FASTAPI_URL;
  }

  _cache = secrets;
  console.log(
    `Successfully loaded secret '${SECRET_NAME}' (${Object.keys(secrets).length} keys)`
  );
  return _cache;
}

export function getConfig() {
  if (!_cache) {
    throw new Error(
      "AWS secrets not loaded yet — call loadSecrets() during startup"
    );
  }
  return _cache;
}
