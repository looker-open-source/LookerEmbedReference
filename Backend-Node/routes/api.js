// Copyright 2022-2026 Google LLC
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

var express = require("express");
var config = require("../config");
var router = express.Router();
const { LookerNodeSDK } = require("@looker/sdk-node");

var createSignedUrl = require("../auth/auth_utils");
const {
  DEFAULT_TTL_SECONDS,
  getAuthSecret,
  createSessionToken,
  verifySessionToken,
  extractTokenFromRequest,
  authenticateUserCredentials,
  buildCookieString,
  isAllowedPostOrigin,
  sendJson,
  isValidEmbedTargetUrl,
  buildBoundedSsoUserProfile,
  createLoginRateLimiter,
  createRequireAuth,
} = require("../auth/session_auth");

let sdkInstance;
function getSdk() {
  if (!sdkInstance) {
    sdkInstance = LookerNodeSDK.init40();
  }
  return sdkInstance;
}

function getEmbedHost() {
  return process.env.LOOKERSDK_EMBED_HOST;
}

function getEmbedSecret() {
  return process.env.LOOKERSDK_EMBED_SECRET;
}

const loginRateLimiter = createLoginRateLimiter();
const requireAuth = createRequireAuth(() => config);

function hasJsonContentType(req) {
  const headers = (req && req.headers) || {};
  const contentType = headers["content-type"] || headers["Content-Type"];
  if (typeof contentType !== "string") {
    return false;
  }
  return /^application\/json\b/i.test(contentType.trim());
}

function withAuth(handler) {
  return async (req, res, next) => {
    let authorized = false;
    requireAuth(req, res, () => {
      authorized = true;
    });
    if (!authorized) {
      return undefined;
    }
    return handler(req, res, next);
  };
}

function buildPublicSessionProfile(userProfile) {
  return {
    first_name: userProfile.first_name || "",
    last_name: userProfile.last_name || "",
    models: Array.isArray(userProfile.models) ? [...userProfile.models] : [],
    permissions: Array.isArray(userProfile.permissions)
      ? [...userProfile.permissions]
      : [],
    session_length: Number(userProfile.session_length) || DEFAULT_TTL_SECONDS,
  };
}

/*****************************************
 * Session Authentication                *
 *****************************************/

router.post("/login", (req, res) => {
  if (!isAllowedPostOrigin(req)) {
    return sendJson(res, 403, { error: "Origin not allowed" });
  }
  if (!hasJsonContentType(req)) {
    return sendJson(res, 415, { error: "Content-Type must be application/json" });
  }

  const body = req && req.body && typeof req.body === "object" ? req.body : {};
  const ipKey =
    (req && ((req.socket && req.socket.remoteAddress) || req.ip)) || null;
  if (
    loginRateLimiter.isRateLimited(
      ipKey,
      body.username,
      config.authenticatedUser
    )
  ) {
    return sendJson(res, 429, {
      error: "Too many login attempts. Please try again later.",
    });
  }

  const secret = getAuthSecret();
  if (!secret) {
    return sendJson(res, 500, {
      error: "Server authentication is not configured (PBL_AUTH_SECRET)",
    });
  }

  const userProfile = authenticateUserCredentials(
    body.username,
    body.password,
    config.authenticatedUser,
    config.userCredentials
  );
  if (!userProfile) {
    loginRateLimiter.recordFailure(
      ipKey,
      body.username,
      config.authenticatedUser
    );
    return sendJson(res, 401, { error: "Invalid credentials" });
  }

  loginRateLimiter.resetIp(ipKey);
  const ttlSeconds = Number(userProfile.session_length) || DEFAULT_TTL_SECONDS;
  const token = createSessionToken(body.username, secret, ttlSeconds);
  res.setHeader("Set-Cookie", buildCookieString(token, ttlSeconds, req));
  return sendJson(res, 200, {
    authenticated: true,
    user: body.username,
    expires_in: ttlSeconds,
    profile: buildPublicSessionProfile(userProfile),
  });
});

router.post("/logout", (req, res) => {
  if (!isAllowedPostOrigin(req)) {
    return sendJson(res, 403, { error: "Origin not allowed" });
  }
  res.setHeader("Set-Cookie", buildCookieString("", 0, req));
  return sendJson(res, 200, { authenticated: false });
});

router.get("/session", (req, res) => {
  const secret = getAuthSecret();
  if (!secret) {
    return sendJson(res, 500, {
      error: "Server authentication is not configured (PBL_AUTH_SECRET)",
    });
  }
  const token = extractTokenFromRequest(req);
  const verified = verifySessionToken(token, secret, config.authenticatedUser);
  if (!verified) {
    return sendJson(res, 401, { authenticated: false });
  }
  return sendJson(res, 200, {
    authenticated: true,
    user: verified.userId,
    profile: buildPublicSessionProfile(verified.userProfile),
  });
});

/*****************************************
 * Authenticated Looker Embed Endpoints  *
 *****************************************/

/**
 * Create an API auth token based on the authenticated embed user
 */
router.get(
  "/embed-user/token",
  withAuth(async (req, res) => {
    const queryId = req.query && req.query.id;
    if (queryId !== undefined && queryId !== req.authenticatedUser.external_user_id) {
      return sendJson(res, 403, { error: "Forbidden" });
    }
    try {
      const sdk = getSdk();
      const userCred = await sdk.ok(
        sdk.user_for_credential("embed", req.authenticatedUser.external_user_id)
      );
      const embed_user_token = await sdk.login_user(userCred.id.toString());
      return sendJson(res, 200, {
        user_token: embed_user_token.value,
        token_last_refreshed: Date.now(),
      });
    } catch (_err) {
      return sendJson(res, 502, { error: "Failed to create embed user token" });
    }
  })
);

/**
 * Update the authenticated embed user's attributes
 */
router.post(
  "/embed-user/:id/update",
  withAuth(async (req, res) => {
    if (!isAllowedPostOrigin(req)) {
      return sendJson(res, 403, { error: "Origin not allowed" });
    }
    if (!req.params || req.params.id !== req.authenticatedUser.external_user_id) {
      return sendJson(res, 403, { error: "Forbidden" });
    }
    try {
      const sdk = getSdk();
      const userCred = await sdk.ok(
        sdk.user_for_credential("embed", req.authenticatedUser.external_user_id)
      );
      const attrs = {
        value: "Jeans",
      };
      await sdk.set_user_attribute_user_value(userCred.id, 23, attrs);
      return sendJson(res, 200, { status: "updated" });
    } catch (_err) {
      return sendJson(res, 502, { error: "Failed to update embed user" });
    }
  })
);

/**
 * Create a signed URL for embedding content for the authenticated session user
 */
router.get(
  "/auth",
  withAuth(async (req, res) => {
    const src = req.query && req.query.src;
    if (!isValidEmbedTargetUrl(src)) {
      return sendJson(res, 400, { error: "Invalid embed src path" });
    }
    const host = getEmbedHost();
    const secret = getEmbedSecret();
    if (!host || !secret) {
      return sendJson(res, 500, { error: "Embed host or secret is not configured" });
    }
    const url = createSignedUrl(src, req.authenticatedUser, host, secret);
    return sendJson(res, 200, { url });
  })
);

/**
 * Endpoint for signing an embed URL bounded strictly to the authenticated user's grants
 */
router.post(
  "/sso-url",
  withAuth(async (req, res) => {
    if (!isAllowedPostOrigin(req)) {
      return sendJson(res, 403, { error: "Origin not allowed" });
    }
    const headers = (req && req.headers) || {};
    if ((headers["content-type"] || headers["Content-Type"]) && !hasJsonContentType(req)) {
      return sendJson(res, 415, { error: "Content-Type must be application/json" });
    }
    const host = getEmbedHost();
    const secret = getEmbedSecret();
    if (!host || !secret) {
      return sendJson(res, 500, { error: "Embed host or secret is not configured" });
    }
    const validation = buildBoundedSsoUserProfile(
      req && req.body,
      req.authenticatedUser
    );
    if (!validation.ok) {
      return sendJson(res, validation.status, { error: validation.error });
    }
    const response = {
      url: createSignedUrl(
        validation.targetUrl,
        validation.userProfile,
        host,
        secret
      ),
    };
    return sendJson(res, 200, response);
  })
);

/****************************************
 * Backend Data API calls               *
 ****************************************/

/**
 * Get details of the current Looker API service user
 */
router.get(
  "/me",
  withAuth(async (_req, res) => {
    try {
      const sdk = getSdk();
      const me = await sdk.ok(sdk.me());
      return sendJson(res, 200, me);
    } catch (_err) {
      return sendJson(res, 502, { error: "Failed to fetch user details" });
    }
  })
);

/**
 * Get a list of all looks accessible to the configured Looker API user
 */
router.get(
  "/looks",
  withAuth(async (_req, res) => {
    try {
      const sdk = getSdk();
      const looks = await sdk.ok(sdk.all_looks("id,title,embed_url,query_id"));
      return sendJson(res, 200, looks);
    } catch (_err) {
      return sendJson(res, 502, { error: "Failed to fetch looks" });
    }
  })
);

/**
 * Run the query associated with a look, and return that data as a json response
 */
router.get(
  "/looks/:id",
  withAuth(async (req, res) => {
    try {
      const sdk = getSdk();
      const target_look = req.params && req.params.id;
      const query_data = await sdk.ok(sdk.look(target_look, "query"));
      if (!query_data || !query_data.query) {
        return sendJson(res, 404, { error: "Look query not found" });
      }
      delete query_data.query.client_id;
      const newQuery = await sdk.ok(sdk.create_query(query_data.query));
      const newQueryResults = await sdk.ok(
        sdk.run_query({ query_id: Number(newQuery.id), result_format: "json" })
      );
      return sendJson(res, 200, newQueryResults);
    } catch (_err) {
      return sendJson(res, 502, { error: "Failed to run look query" });
    }
  })
);

module.exports = router;
