// Copyright 2026 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

const crypto = require("crypto");

const SESSION_COOKIE_NAME = "pbl_session";
const MIN_TTL_SECONDS = 60;
const DEFAULT_TTL_SECONDS = 3600;
const MAX_TTL_SECONDS = 86400;
const MIN_SECRET_LENGTH = 32;
const USER_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const SEGMENT_PATTERN = /^[A-Za-z0-9_-]+$/;
const DISPLAY_NAME_PATTERN = /^[\p{L}\p{N} .,'_-]{0,64}$/u;
const PLACEHOLDER_WRAPPED_PATTERN = /^(?:\{.*\}|\[.*\]|<.*>)$/;
const PLACEHOLDER_SUBSTRINGS = [
  "SESSION-SECRET",
  "SESSION_SECRET",
  "USER1-PASSWORD",
  "USER2-PASSWORD",
  "USER1_PASSWORD",
  "USER2_PASSWORD",
  "CHANGE_ME",
  "CHANGEME",
  "YOUR_",
];

function isPlaceholderValue(raw) {
  if (typeof raw !== "string") return true;
  const trimmed = raw.trim();
  if (!trimmed || trimmed === "<>" || PLACEHOLDER_WRAPPED_PATTERN.test(trimmed)) {
    return true;
  }
  const upper = trimmed.toUpperCase();
  return PLACEHOLDER_SUBSTRINGS.some((token) => upper.includes(token));
}

function base64UrlEncode(input) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(String(input), "utf8");
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecodeToBuffer(input) {
  if (typeof input !== "string" || input.length === 0 || /[^A-Za-z0-9_-]/.test(input)) {
    return null;
  }
  const padLength = (4 - (input.length % 4)) % 4;
  const padded = input.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat(padLength);
  return Buffer.from(padded, "base64");
}

function sha256Digest(value) {
  return crypto.createHash("sha256").update(String(value), "utf8").digest();
}

function constantTimeStringEquals(a, b) {
  if (typeof a !== "string" || typeof b !== "string") {
    return false;
  }
  return crypto.timingSafeEqual(sha256Digest(a), sha256Digest(b));
}

function isValidAuthSecret(secret) {
  return (
    typeof secret === "string" &&
    secret.trim().length >= MIN_SECRET_LENGTH &&
    !isPlaceholderValue(secret)
  );
}

function getAuthSecret() {
  const secret = process.env.PBL_AUTH_SECRET;
  return isValidAuthSecret(secret) ? secret : null;
}

function signTokenInput(signingInput, secret) {
  return crypto.createHmac("sha256", secret).update(signingInput, "utf8").digest();
}

function clampSessionTtl(ttlSeconds) {
  const numeric = Number(ttlSeconds);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return DEFAULT_TTL_SECONDS;
  }
  return Math.min(Math.max(Math.floor(numeric), MIN_TTL_SECONDS), MAX_TTL_SECONDS);
}

function createSessionToken(username, secret, ttlSeconds = DEFAULT_TTL_SECONDS, nowSec) {
  if (!isValidAuthSecret(secret)) {
    throw new Error("PBL_AUTH_SECRET must be a non-placeholder secret of at least 32 characters");
  }
  if (typeof username !== "string" || !USER_ID_PATTERN.test(username)) {
    throw new Error("Invalid username");
  }
  const issuedAt =
    typeof nowSec === "number" ? Math.floor(nowSec) : Math.floor(Date.now() / 1000);
  const boundedTtl = clampSessionTtl(ttlSeconds);
  const headerB64 = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payloadB64 = base64UrlEncode(
    JSON.stringify({
      sub: username,
      iat: issuedAt,
      exp: issuedAt + boundedTtl,
    })
  );
  const signingInput = `${headerB64}.${payloadB64}`;
  const signatureB64 = base64UrlEncode(signTokenInput(signingInput, secret));
  return `${signingInput}.${signatureB64}`;
}

function verifySessionToken(token, secret, configuredUsers, nowSec) {
  if (typeof token !== "string" || token.length === 0 || token.length > 2048) {
    return null;
  }
  if (!isValidAuthSecret(secret)) {
    return null;
  }
  if (!configuredUsers || typeof configuredUsers !== "object") {
    return null;
  }
  const parts = token.split(".");
  if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) {
    return null;
  }

  const [headerB64, payloadB64, signatureB64] = parts;
  const providedSig = base64UrlDecodeToBuffer(signatureB64);
  if (!providedSig || providedSig.length !== 32) {
    return null;
  }

  const expectedSig = signTokenInput(`${headerB64}.${payloadB64}`, secret);
  if (
    providedSig.length !== expectedSig.length ||
    !crypto.timingSafeEqual(providedSig, expectedSig)
  ) {
    return null;
  }

  let header;
  let payload;
  try {
    const headerBuf = base64UrlDecodeToBuffer(headerB64);
    const payloadBuf = base64UrlDecodeToBuffer(payloadB64);
    if (!headerBuf || !payloadBuf) {
      return null;
    }
    header = JSON.parse(headerBuf.toString("utf8"));
    payload = JSON.parse(payloadBuf.toString("utf8"));
  } catch (_err) {
    return null;
  }

  if (!header || header.alg !== "HS256" || header.typ !== "JWT") {
    return null;
  }
  if (!payload || typeof payload.sub !== "string" || !USER_ID_PATTERN.test(payload.sub)) {
    return null;
  }

  const currentSec =
    typeof nowSec === "number" ? Math.floor(nowSec) : Math.floor(Date.now() / 1000);
  if (
    !Number.isInteger(payload.iat) ||
    !Number.isInteger(payload.exp) ||
    payload.iat > currentSec + 60 ||
    currentSec >= payload.exp ||
    payload.exp - payload.iat > MAX_TTL_SECONDS
  ) {
    return null;
  }

  if (!Object.prototype.hasOwnProperty.call(configuredUsers, payload.sub)) {
    return null;
  }
  const userProfile = configuredUsers[payload.sub];
  if (!userProfile || typeof userProfile !== "object") {
    return null;
  }

  return {
    userId: payload.sub,
    userProfile,
  };
}

function parseCookiesHeader(cookieHeader) {
  const cookies = Object.create(null);
  if (typeof cookieHeader !== "string" || !cookieHeader) {
    return cookies;
  }
  for (const part of cookieHeader.split(";")) {
    const eqIdx = part.indexOf("=");
    if (eqIdx <= 0) continue;
    const key = part.slice(0, eqIdx).trim();
    const rawVal = part.slice(eqIdx + 1).trim();
    if (!key) continue;
    try {
      cookies[key] = decodeURIComponent(rawVal);
    } catch (_err) {
      cookies[key] = rawVal;
    }
  }
  return cookies;
}

function extractTokenFromRequest(req) {
  if (!req || typeof req !== "object") {
    return null;
  }
  const headers = req.headers || {};
  const authHeader = headers.authorization || headers.Authorization;
  if (typeof authHeader === "string") {
    const match = /^Bearer\s+(\S+)$/i.exec(authHeader.trim());
    if (match) {
      return match[1];
    }
  }
  if (req.cookies && typeof req.cookies[SESSION_COOKIE_NAME] === "string") {
    return req.cookies[SESSION_COOKIE_NAME];
  }
  const parsedCookies = parseCookiesHeader(headers.cookie || headers.Cookie);
  if (typeof parsedCookies[SESSION_COOKIE_NAME] === "string") {
    return parsedCookies[SESSION_COOKIE_NAME];
  }
  return null;
}

function isConfiguredUser(username, configuredUsers) {
  return (
    typeof username === "string" &&
    USER_ID_PATTERN.test(username) &&
    Boolean(configuredUsers) &&
    Object.prototype.hasOwnProperty.call(configuredUsers, username) &&
    Boolean(configuredUsers[username]) &&
    typeof configuredUsers[username] === "object"
  );
}

function authenticateUserCredentials(username, password, configuredUsers, userCredentials) {
  if (
    !isConfiguredUser(username, configuredUsers) ||
    typeof password !== "string" ||
    password.length === 0 ||
    password.length > 256 ||
    !userCredentials ||
    !Object.prototype.hasOwnProperty.call(userCredentials, username)
  ) {
    return null;
  }
  const expectedPassword = userCredentials[username];
  if (typeof expectedPassword !== "string" || isPlaceholderValue(expectedPassword)) {
    return null;
  }
  if (!constantTimeStringEquals(password, expectedPassword)) {
    return null;
  }
  return configuredUsers[username];
}

function isHttpsRequest(req) {
  if (process.env.PBL_COOKIE_SECURE === "true") return true;
  if (process.env.PBL_COOKIE_SECURE === "false") return false;
  if (req && req.secure) return true;
  const forwardedProto =
    req && req.headers ? String(req.headers["x-forwarded-proto"] || "") : "";
  const firstHop = forwardedProto.split(",", 1)[0].trim().toLowerCase();
  return firstHop === "https";
}

function buildCookieString(value, maxAgeSeconds, req) {
  const attrs = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(value)}`,
    "Path=/api",
    "HttpOnly",
    "SameSite=Strict",
    `Max-Age=${Math.max(0, Math.floor(maxAgeSeconds))}`,
  ];
  if (isHttpsRequest(req)) {
    attrs.push("Secure");
  }
  return attrs.join("; ");
}

function isAllowedPostOrigin(req, allowedFrontendOrigin) {
  const headers = (req && req.headers) || {};
  const origin = headers.origin || headers.Origin;
  if (typeof origin !== "string" || origin.trim().length === 0) {
    return true;
  }
  const normalizedOrigin = origin.trim().toLowerCase();
  const configuredOrigin = String(
    allowedFrontendOrigin || process.env.PBL_FRONTEND_ORIGIN || "https://localhost:3001"
  )
    .trim()
    .toLowerCase();
  if (normalizedOrigin === configuredOrigin) {
    return true;
  }
  const hostHeader = String(headers.host || headers.Host || "").trim().toLowerCase();
  if (hostHeader) {
    if (
      normalizedOrigin === `https://${hostHeader}` ||
      normalizedOrigin === `http://${hostHeader}`
    ) {
      return true;
    }
  }
  return false;
}

function sendJson(res, statusCode, payload) {
  res.setHeader("Content-Type", "application/json");
  return res.status(statusCode).send(payload);
}

function isLoopbackAddress(addr) {
  if (typeof addr !== "string") {
    return false;
  }
  const normalized = addr.trim().toLowerCase();
  return (
    normalized === "127.0.0.1" ||
    normalized === "::1" ||
    normalized === "::ffff:127.0.0.1" ||
    normalized === "0:0:0:0:0:0:0:1"
  );
}

function extractClientIp(req) {
  if (!req || typeof req !== "object") {
    return null;
  }
  const remoteAddress =
    req.socket && typeof req.socket.remoteAddress === "string"
      ? req.socket.remoteAddress.trim()
      : null;
  const trustProxyEnv = process.env.PBL_TRUST_PROXY;
  const trustForwarded =
    trustProxyEnv === "true" ||
    (trustProxyEnv !== "false" && isLoopbackAddress(remoteAddress));
  if (trustForwarded) {
    const headers = req.headers || {};
    const xff = headers["x-forwarded-for"] || headers["X-Forwarded-For"];
    if (typeof xff === "string" && xff.trim().length > 0) {
      const firstHop = xff.split(",", 1)[0].trim();
      if (firstHop) {
        return firstHop;
      }
    }
    if (typeof req.ip === "string" && req.ip.trim().length > 0) {
      return req.ip.trim();
    }
  }
  if (remoteAddress) {
    return remoteAddress;
  }
  if (typeof req.ip === "string" && req.ip.trim().length > 0) {
    return req.ip.trim();
  }
  return null;
}

function hasDisallowedTargetChars(value) {
  // eslint-disable-next-line no-control-regex
  return /[\u0000-\u001F\u007F\\#]/.test(value);
}

function isValidEmbedTargetUrl(targetUrl) {
  if (typeof targetUrl !== "string" || targetUrl.length === 0 || targetUrl.length > 4096) {
    return false;
  }
  try {
    encodeURIComponent(targetUrl);
  } catch (_err) {
    return false;
  }
  if (hasDisallowedTargetChars(targetUrl)) {
    return false;
  }
  const pathPart = targetUrl.split("?", 1)[0];
  if (/%2e|%2f|%5c|%25|%00/i.test(pathPart)) {
    return false;
  }
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(pathPart);
    if (decodeURIComponent(decodedPath) !== decodedPath) {
      return false;
    }
  } catch (_err) {
    return false;
  }
  if (hasDisallowedTargetChars(decodedPath)) {
    return false;
  }
  const segments = decodedPath.split("/");
  if (segments.length < 3 || segments[0] !== "" || segments[1] !== "embed") {
    return false;
  }
  if (!SEGMENT_PATTERN.test(segments[2])) {
    return false;
  }
  for (let i = 1; i < segments.length; i += 1) {
    const seg = segments[i];
    if (!seg || seg === "." || seg === "..") {
      return false;
    }
  }
  return true;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function canonicalizeJsonValue(value) {
  if (Array.isArray(value)) {
    return value.map(canonicalizeJsonValue);
  }
  if (isPlainObject(value)) {
    const sorted = {};
    for (const key of Object.keys(value).sort()) {
      sorted[key] = canonicalizeJsonValue(value[key]);
    }
    return sorted;
  }
  return value;
}

function plainObjectsEqual(a, b) {
  return (
    JSON.stringify(canonicalizeJsonValue(a)) ===
    JSON.stringify(canonicalizeJsonValue(b))
  );
}

function normalizeServerSsoUserProfile(serverUser) {
  const safeUser = isPlainObject(serverUser) ? serverUser : {};
  return {
    external_user_id: safeUser.external_user_id ?? "",
    first_name: safeUser.first_name ?? "",
    last_name: safeUser.last_name ?? "",
    session_length: clampSessionTtl(safeUser.session_length),
    force_logout_login: Boolean(safeUser.force_logout_login ?? true),
    permissions: Array.isArray(safeUser.permissions) ? [...safeUser.permissions] : [],
    models: Array.isArray(safeUser.models) ? [...safeUser.models] : [],
    group_ids: Array.isArray(safeUser.group_ids) ? [...safeUser.group_ids] : undefined,
    external_group_id: safeUser.external_group_id ?? "",
    user_attributes: safeUser.user_attributes
      ? { ...safeUser.user_attributes }
      : undefined,
    access_filters: safeUser.access_filters
      ? JSON.parse(JSON.stringify(safeUser.access_filters))
      : {},
    user_timezone: safeUser.user_timezone || undefined,
  };
}

function buildBoundedSsoUserProfile(body, serverUser) {
  if (!isPlainObject(body)) {
    return { ok: false, status: 400, error: "Request body must be a JSON object" };
  }
  if (!isValidEmbedTargetUrl(body.target_url)) {
    return { ok: false, status: 400, error: "target_url must be a valid /embed/ path" };
  }

  if (
    body.external_user_id !== undefined &&
    body.external_user_id !== serverUser.external_user_id
  ) {
    return { ok: false, status: 403, error: "Cannot override authenticated external_user_id" };
  }
  if (
    body.external_group_id !== undefined &&
    body.external_group_id !== serverUser.external_group_id
  ) {
    return { ok: false, status: 403, error: "Cannot override authenticated external_group_id" };
  }
  if (
    body.user_timezone !== undefined &&
    body.user_timezone !== serverUser.user_timezone
  ) {
    return { ok: false, status: 403, error: "Cannot override user_timezone" };
  }
  if (body.user_attributes !== undefined) {
    if (!isPlainObject(body.user_attributes)) {
      return { ok: false, status: 400, error: "user_attributes must be an object" };
    }
    if (!plainObjectsEqual(body.user_attributes, serverUser.user_attributes || {})) {
      return { ok: false, status: 403, error: "Cannot override user_attributes" };
    }
  }
  if (body.access_filters !== undefined) {
    if (!isPlainObject(body.access_filters)) {
      return { ok: false, status: 400, error: "access_filters must be an object" };
    }
    if (!plainObjectsEqual(body.access_filters, serverUser.access_filters || {})) {
      return { ok: false, status: 403, error: "Cannot override access_filters" };
    }
  }

  const allowedServerGroupIds = Array.isArray(serverUser.group_ids)
    ? serverUser.group_ids
    : [];
  let boundedGroupIds = [...allowedServerGroupIds];
  if (body.group_ids !== undefined) {
    if (!Array.isArray(body.group_ids)) {
      return { ok: false, status: 400, error: "group_ids must be an array" };
    }
    for (const gid of body.group_ids) {
      if (!Number.isInteger(gid) || gid < -2147483648 || gid > 2147483647) {
        return { ok: false, status: 400, error: "group_ids must contain integers" };
      }
      if (!allowedServerGroupIds.includes(gid)) {
        return { ok: false, status: 403, error: "Requested group_ids not permitted" };
      }
    }
    boundedGroupIds = allowedServerGroupIds.filter((gid) => body.group_ids.includes(gid));
  }

  const allowedServerPermissions = Array.isArray(serverUser.permissions)
    ? serverUser.permissions
    : [];
  let boundedPermissions = [...allowedServerPermissions];
  if (body.permissions !== undefined) {
    if (!Array.isArray(body.permissions) || body.permissions.length === 0) {
      return { ok: false, status: 400, error: "permissions must be a non-empty array" };
    }
    for (const perm of body.permissions) {
      if (typeof perm !== "string" || !allowedServerPermissions.includes(perm)) {
        return { ok: false, status: 403, error: "Requested permissions exceed user grant" };
      }
    }
    boundedPermissions = allowedServerPermissions.filter((perm) =>
      body.permissions.includes(perm)
    );
  }

  const allowedServerModels = Array.isArray(serverUser.models) ? serverUser.models : [];
  let boundedModels = [...allowedServerModels];
  if (body.models !== undefined) {
    if (!Array.isArray(body.models) || body.models.length === 0) {
      return { ok: false, status: 400, error: "models must be a non-empty array" };
    }
    for (const model of body.models) {
      if (typeof model !== "string" || !allowedServerModels.includes(model)) {
        return { ok: false, status: 403, error: "Requested models exceed user grant" };
      }
    }
    boundedModels = allowedServerModels.filter((model) => body.models.includes(model));
  }

  const maxSessionLength = clampSessionTtl(serverUser.session_length);
  let sessionLength = maxSessionLength;
  if (
    body.session_length !== undefined &&
    body.session_length !== null &&
    !(typeof body.session_length === "string" && body.session_length.trim() === "")
  ) {
    const parsedLen =
      typeof body.session_length === "number" || typeof body.session_length === "string"
        ? Number(body.session_length)
        : NaN;
    if (!Number.isInteger(parsedLen) || parsedLen < 60 || parsedLen > maxSessionLength) {
      return {
        ok: false,
        status: 400,
        error: `session_length must be an integer between 60 and ${maxSessionLength}`,
      };
    }
    sessionLength = parsedLen;
  }

  const firstName =
    typeof body.first_name === "string" &&
    body.first_name.trim().length > 0 &&
    DISPLAY_NAME_PATTERN.test(body.first_name)
      ? body.first_name.trim()
      : serverUser.first_name ?? "";
  const lastName =
    typeof body.last_name === "string" &&
    body.last_name.trim().length > 0 &&
    DISPLAY_NAME_PATTERN.test(body.last_name)
      ? body.last_name.trim()
      : serverUser.last_name ?? "";

  return {
    ok: true,
    targetUrl: body.target_url,
    userProfile: {
      external_user_id: serverUser.external_user_id ?? "",
      first_name: firstName,
      last_name: lastName,
      session_length: sessionLength,
      force_logout_login: Boolean(serverUser.force_logout_login ?? true),
      permissions: boundedPermissions,
      models: boundedModels,
      group_ids: boundedGroupIds,
      external_group_id: serverUser.external_group_id ?? "",
      user_attributes: serverUser.user_attributes
        ? { ...serverUser.user_attributes }
        : undefined,
      access_filters: serverUser.access_filters
        ? JSON.parse(JSON.stringify(serverUser.access_filters))
        : {},
      user_timezone: serverUser.user_timezone || undefined,
    },
  };
}

function normalizeRateLimitUsername(username) {
  if (typeof username !== "string") {
    return null;
  }
  const trimmed = username.trim();
  if (trimmed.length === 0) {
    return null;
  }
  return trimmed.slice(0, 64);
}

function createLoginRateLimiter({ windowMs = 60000, maxAttempts = 10, maxIpAttempts } = {}) {
  const attempts = new Map();
  const maxEntries = 4096;
  const effectiveMaxIpAttempts =
    typeof maxIpAttempts === "number" && maxIpAttempts > 0
      ? maxIpAttempts
      : Math.max(maxAttempts * 3, maxAttempts);

  function resolveNow(maybeNowOrLegacy, maybeNow) {
    if (typeof maybeNowOrLegacy === "number") {
      return maybeNowOrLegacy;
    }
    if (typeof maybeNow === "number") {
      return maybeNow;
    }
    return Date.now();
  }

  function isBucketLimited(bucketKey, limit, now) {
    const entry = attempts.get(bucketKey);
    if (!entry) return false;
    if (now >= entry.resetAt) {
      attempts.delete(bucketKey);
      return false;
    }
    return entry.count >= limit;
  }

  function incrementBucket(bucketKey, now) {
    const existing = attempts.get(bucketKey);
    if (existing && now < existing.resetAt) {
      existing.count += 1;
      return;
    }
    if (attempts.size >= maxEntries) {
      for (const [k, v] of attempts.entries()) {
        if (now >= v.resetAt) attempts.delete(k);
      }
      if (attempts.size >= maxEntries) {
        return;
      }
    }
    attempts.set(bucketKey, { count: 1, resetAt: now + windowMs });
  }

  return {
    isRateLimited(ipKey, username, maybeNowOrLegacy, maybeNow) {
      const now = resolveNow(maybeNowOrLegacy, maybeNow);
      if (ipKey && isBucketLimited(`ip:${ipKey}`, effectiveMaxIpAttempts, now)) {
        return true;
      }
      const normalizedUser = normalizeRateLimitUsername(username);
      if (
        normalizedUser &&
        isBucketLimited(`acct:${ipKey || "unknown"}:${normalizedUser}`, maxAttempts, now)
      ) {
        return true;
      }
      return false;
    },
    recordFailure(ipKey, username, maybeNowOrLegacy, maybeNow) {
      const now = resolveNow(maybeNowOrLegacy, maybeNow);
      if (ipKey) {
        incrementBucket(`ip:${ipKey}`, now);
      }
      const normalizedUser = normalizeRateLimitUsername(username);
      if (normalizedUser) {
        incrementBucket(`acct:${ipKey || "unknown"}:${normalizedUser}`, now);
      }
    },
    resetSuccess(ipKey, username) {
      const normalizedUser = normalizeRateLimitUsername(username);
      if (normalizedUser) {
        attempts.delete(`acct:${ipKey || "unknown"}:${normalizedUser}`);
      }
    },
    resetIp(ipKey) {
      if (ipKey) {
        attempts.delete(`ip:${ipKey}`);
      }
    },
  };
}

function createRequireAuth(getConfig) {
  return function requireAuth(req, res, next) {
    const secret = getAuthSecret();
    if (!secret) {
      return sendJson(res, 500, {
        error: "Server authentication is not configured (PBL_AUTH_SECRET)",
      });
    }
    const cfg = typeof getConfig === "function" ? getConfig() : getConfig;
    const configuredUsers = cfg && cfg.authenticatedUser ? cfg.authenticatedUser : null;
    const token = extractTokenFromRequest(req);
    const verified = verifySessionToken(token, secret, configuredUsers);
    if (!verified) {
      return sendJson(res, 401, { error: "Authentication required" });
    }
    req.authenticatedUserId = verified.userId;
    req.authenticatedUser = verified.userProfile;
    if (typeof next === "function") {
      return next();
    }
    return undefined;
  };
}

module.exports = {
  SESSION_COOKIE_NAME,
  DEFAULT_TTL_SECONDS,
  clampSessionTtl,
  isPlaceholderValue,
  getAuthSecret,
  createSessionToken,
  verifySessionToken,
  extractTokenFromRequest,
  isConfiguredUser,
  authenticateUserCredentials,
  buildCookieString,
  isAllowedPostOrigin,
  sendJson,
  extractClientIp,
  isValidEmbedTargetUrl,
  normalizeServerSsoUserProfile,
  buildBoundedSsoUserProfile,
  createLoginRateLimiter,
  createRequireAuth,
};
