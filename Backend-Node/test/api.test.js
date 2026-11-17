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

const assert = require("assert").strict;
const http = require("http");

const TEST_AUTH_SECRET = "0123456789abcdef0123456789abcdef0123456789abcdef";
const TEST_USER1_PASSWORD = "test-user1-pass-9876";
const TEST_USER2_PASSWORD = "test-user2-pass-5432";

process.env.LOOKERSDK_EMBED_HOST = "example.looker.com";
process.env.LOOKERSDK_EMBED_SECRET = "embed-signing-secret-for-unit-tests";
process.env.PBL_AUTH_SECRET = TEST_AUTH_SECRET;
process.env.PBL_USER1_PASSWORD = TEST_USER1_PASSWORD;
process.env.PBL_USER2_PASSWORD = TEST_USER2_PASSWORD;
process.env.PBL_FRONTEND_ORIGIN = "https://localhost:3001";

const config = require("../config");
config.userCredentials.user1 = TEST_USER1_PASSWORD;
config.userCredentials.user2 = TEST_USER2_PASSWORD;

const app = require("../server");
const apiRouter = require("../routes/api");
const createSignedUrl = require("../auth/auth_utils");
const {
  createSessionToken,
  isPlaceholderValue,
  authenticateUserCredentials,
  extractClientIp,
  isValidEmbedTargetUrl,
} = require("../auth/session_auth");

function requestRaw(server, method, path, { headers = {}, rawBody, contentType } = {}) {
  return new Promise((resolve, reject) => {
    const addr = server.address();
    const reqHeaders = { ...headers };
    if (rawBody !== undefined) {
      if (contentType !== undefined) {
        reqHeaders["Content-Type"] = contentType;
      }
      reqHeaders["Content-Length"] = Buffer.byteLength(rawBody);
    }
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port: addr.port,
        path,
        method,
        headers: reqHeaders,
      },
      (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          let parsed = text;
          try {
            parsed = JSON.parse(text);
          } catch (_err) {
            // Keep raw text when response is not JSON.
          }
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: parsed,
          });
        });
      }
    );
    req.on("error", reject);
    if (rawBody !== undefined) {
      req.write(rawBody);
    }
    req.end();
  });
}

function requestJson(server, method, path, { headers = {}, body } = {}) {
  return requestRaw(server, method, path, {
    headers,
    rawBody: body !== undefined ? JSON.stringify(body) : undefined,
    contentType: body !== undefined ? "application/json" : undefined,
  });
}

async function runTests() {
  const server = await new Promise((resolve) => {
    const srv = app.listen(0, "127.0.0.1", () => resolve(srv));
  });

  const cases = [
    [
      "rejects template placeholder secrets and passwords",
      async () => {
        assert.equal(isPlaceholderValue("{SESSION-SECRET-AT-LEAST-32-CHARS}"), true);
        assert.equal(isPlaceholderValue("[SESSION_SECRET_MIN_32_CHARS]"), true);
        assert.equal(isPlaceholderValue("<>"), true);
        assert.equal(isPlaceholderValue(TEST_AUTH_SECRET), false);
        assert.throws(() =>
          createSessionToken("user1", "{SESSION-SECRET-AT-LEAST-32-CHARS}", 3600)
        );
        assert.equal(
          authenticateUserCredentials(
            "user1",
            "{USER1-PASSWORD}",
            config.authenticatedUser,
            { user1: "{USER1-PASSWORD}" }
          ),
          null
        );
      },
    ],
    [
      "rejects unauthenticated GET /api/auth even if usertoken header is supplied",
      async () => {
        const res = await requestJson(
          server,
          "GET",
          "/api/auth?src=%2Fembed%2Fdashboards%2F1",
          { headers: { usertoken: "user1" } }
        );
        assert.equal(res.status, 401);
        assert.equal(res.body.url, undefined);
      },
    ],
    [
      "rejects unauthenticated POST /api/sso-url requests",
      async () => {
        const res = await requestJson(server, "POST", "/api/sso-url", {
          body: {
            target_url: "/embed/dashboards/1",
            external_user_id: "custom_user",
            permissions: ["access_data", "explore"],
            models: ["all_models"],
          },
        });
        assert.equal(res.status, 401);
        assert.equal(res.body.url, undefined);
      },
    ],
    [
      "blocks cross-origin POSTs, form-encoded login, and malformed JSON payloads",
      async () => {
        const crossOriginLogin = await requestJson(server, "POST", "/api/login", {
          headers: { Origin: "https://other.example.com" },
          body: { username: "user1", password: TEST_USER1_PASSWORD },
        });
        assert.equal(crossOriginLogin.status, 403);

        const formLogin = await requestRaw(server, "POST", "/api/login", {
          rawBody: `username=user1&password=${TEST_USER1_PASSWORD}`,
          contentType: "application/x-www-form-urlencoded",
        });
        assert.equal(formLogin.status, 415);

        const malformedJson = await requestRaw(server, "POST", "/api/login", {
          rawBody: '{"username":',
          contentType: "application/json",
        });
        assert.equal(malformedJson.status, 400);
        assert.equal(malformedJson.body.error, "Invalid request payload");
      },
    ],
    [
      "authenticates valid credentials, sets Secure cookie on multi-hop HTTPS, and ignores usertoken header",
      async () => {
        const badRes = await requestJson(server, "POST", "/api/login", {
          body: { username: "user1", password: "wrong-password" },
        });
        assert.equal(badRes.status, 401);

        const loginRes = await requestJson(server, "POST", "/api/login", {
          headers: {
            Origin: "https://localhost:3001",
            "X-Forwarded-Proto": "https, http",
          },
          body: { username: "user1", password: TEST_USER1_PASSWORD },
        });
        assert.equal(loginRes.status, 200);
        assert.equal(loginRes.body.authenticated, true);
        assert.equal(loginRes.body.user, "user1");

        const setCookie = loginRes.headers["set-cookie"];
        assert.ok(Array.isArray(setCookie) && setCookie.length > 0);
        assert.match(setCookie[0], /^pbl_session=/);
        assert.match(setCookie[0], /HttpOnly/);
        assert.match(setCookie[0], /SameSite=Strict/);
        assert.match(setCookie[0], /Secure/);

        const cookiePair = setCookie[0].split(";", 1)[0];

        const sessionRes = await requestJson(server, "GET", "/api/session", {
          headers: { Cookie: cookiePair },
        });
        assert.equal(sessionRes.status, 200);
        assert.equal(sessionRes.body.user, "user1");

        const authRes = await requestJson(
          server,
          "GET",
          "/api/auth?src=%2Fembed%2Fdashboards%2F1",
          {
            headers: {
              Cookie: cookiePair,
              usertoken: "user2",
            },
          }
        );
        assert.equal(authRes.status, 200);
        assert.match(authRes.body.url, /external_user_id=%22user1%22/);
        assert.doesNotMatch(authRes.body.url, /external_user_id=%22user2%22/);

        const logoutRes = await requestJson(server, "POST", "/api/logout", {
          headers: { Cookie: cookiePair, Origin: "https://localhost:3001" },
        });
        assert.equal(logoutRes.status, 200);
        assert.match(logoutRes.headers["set-cookie"][0], /Max-Age=0/);
      },
    ],
    [
      "validates /embed/ prefix and rejects single/double encoded traversal on GET /api/auth",
      async () => {
        const token = createSessionToken("user1", TEST_AUTH_SECRET, 3600);
        const authHeaders = { Authorization: `Bearer ${token}` };

        for (const badSrc of [
          "/admin/users",
          "/embed/dashboards/../../admin",
          "/embed/dashboards/%2e%2e/%2e%2e/admin",
          "/embed/dashboards/%252e%252e/%252e%252e/admin",
          "/embed/dashboards/%255c..",
          "/embed/dashboards/1#fragment",
          "/embed/dashboards/1%23frag",
          "/embed/dashboards/1%0d%0ax",
          "/embed/dashboards/1%0ax",
          "/embed/dashboards/1%7fx",
          "/embed//dashboards/1",
        ]) {
          const res = await requestJson(
            server,
            "GET",
            `/api/auth?src=${encodeURIComponent(badSrc)}`,
            { headers: authHeaders }
          );
          assert.equal(res.status, 400, `Expected 400 for src=${badSrc}`);
        }

        assert.equal(isValidEmbedTargetUrl("/embed/dashboards/1?x=\ud800"), false);
        assert.equal(isValidEmbedTargetUrl("/embed/dashboards/1?x=\udc00"), false);

        for (const rawSsoPayload of [
          '{"target_url":"/embed/dashboards/1?x=\\ud800"}',
          '{"target_url":"/embed/dashboards/1?x=\\udc00"}',
          '{"target_url":"/embed/dashboards/1%0d%0ax"}',
          '{"target_url":"/embed/dashboards/1%23frag"}',
        ]) {
          const badSsoRes = await requestRaw(server, "POST", "/api/sso-url", {
            headers: authHeaders,
            rawBody: rawSsoPayload,
            contentType: "application/json",
          });
          assert.equal(badSsoRes.status, 400, `Expected 400 for payload=${rawSsoPayload}`);
        }

        const filteredExploreRes = await requestJson(
          server,
          "GET",
          "/api/auth?src=" +
            encodeURIComponent(
              "/embed/explore/data_block_acs_bigquery/acs_census_data?embed_domain=https://localhost:3001&sdk=2&f[state.name]=California"
            ),
          { headers: authHeaders }
        );
        assert.equal(filteredExploreRes.status, 200);
        assert.match(filteredExploreRes.body.url, /signature=/);
      },
    ],
    [
      "bounds POST /api/sso-url strictly to the authenticated user's configured grants",
      async () => {
        const user2Token = createSessionToken("user2", TEST_AUTH_SECRET, 3600);
        const authHeaders = { Authorization: `Bearer ${user2Token}` };

        const idOverride = await requestJson(server, "POST", "/api/sso-url", {
          headers: authHeaders,
          body: {
            target_url: "/embed/dashboards/1",
            external_user_id: "user1",
          },
        });
        assert.equal(idOverride.status, 403);

        const permEscalation = await requestJson(
          server,
          "POST",
          "/api/sso-url",
          {
            headers: authHeaders,
            body: {
              target_url: "/embed/dashboards/1",
              permissions: ["access_data", "explore"],
            },
          }
        );
        assert.equal(permEscalation.status, 403);

        const modelEscalation = await requestJson(
          server,
          "POST",
          "/api/sso-url",
          {
            headers: authHeaders,
            body: {
              target_url: "/embed/dashboards/1",
              models: ["ungranted_model"],
            },
          }
        );
        assert.equal(modelEscalation.status, 403);

        const nonObjectAttr = await requestJson(server, "POST", "/api/sso-url", {
          headers: authHeaders,
          body: {
            target_url: "/embed/dashboards/1",
            user_attributes: "invalid",
          },
        });
        assert.equal(nonObjectAttr.status, 400);

        const attrOverride = await requestJson(server, "POST", "/api/sso-url", {
          headers: authHeaders,
          body: {
            target_url: "/embed/dashboards/1",
            user_attributes: { locale: "fr_FR" },
          },
        });
        assert.equal(attrOverride.status, 403);

        const validSubset = await requestJson(server, "POST", "/api/sso-url", {
          headers: authHeaders,
          body: {
            target_url: "/embed/dashboards/1",
            permissions: ["access_data", "see_looks"],
            models: ["data_block_acs_bigquery"],
            session_length: 1800,
          },
        });
        assert.equal(validSubset.status, 200);
        assert.match(validSubset.body.url, /external_user_id=%22user2%22/);
        assert.match(validSubset.body.url, /session_length=1800/);
        assert.match(validSubset.body.url, /signature=/);
      },
    ],
    [
      "enforces authenticated user ownership on embed-user routes and rate-limits repeated login failures",
      async () => {
        const user2Token = createSessionToken("user2", TEST_AUTH_SECRET, 3600);
        const authHeaders = { Authorization: `Bearer ${user2Token}` };

        const tokenMismatch = await requestJson(
          server,
          "GET",
          "/api/embed-user/token?id=user1",
          { headers: authHeaders }
        );
        assert.equal(tokenMismatch.status, 403);

        const updateMismatch = await requestJson(
          server,
          "POST",
          "/api/embed-user/user1/update",
          { headers: authHeaders }
        );
        assert.equal(updateMismatch.status, 403);

        const protoToken = createSessionToken(
          "toString",
          TEST_AUTH_SECRET,
          3600
        );
        const protoRes = await requestJson(
          server,
          "GET",
          "/api/auth?src=%2Fembed%2Fdashboards%2F1",
          { headers: { Authorization: `Bearer ${protoToken}` } }
        );
        assert.equal(protoRes.status, 401);

        let lastStatus = 0;
        for (let i = 0; i < 11; i += 1) {
          const failRes = await requestJson(server, "POST", "/api/login", {
            body: { username: "user2", password: "incorrect" },
          });
          lastStatus = failRes.status;
        }
        assert.equal(lastStatus, 429);
      },
    ],
    [
      "defaults nullable SSO string fields to empty strings and falls back when session_length is empty or null",
      async () => {
        config.authenticatedUser.minimalUser = {
          external_user_id: "minimalUser",
          first_name: null,
          last_name: null,
          permissions: ["access_data"],
          models: ["data_block_acs_bigquery"],
          group_ids: null,
          external_group_id: null,
          user_attributes: { locale: "en_US" },
          access_filters: {},
          user_timezone: null,
        };
        try {
          const minimalToken = createSessionToken(
            "minimalUser",
            TEST_AUTH_SECRET,
            3600
          );
          const authHeaders = { Authorization: `Bearer ${minimalToken}` };

          const authRes = await requestJson(
            server,
            "GET",
            "/api/auth?src=%2Fembed%2Fdashboards%2F1",
            { headers: authHeaders }
          );
          assert.equal(authRes.status, 200);
          assert.match(authRes.body.url, /session_length=3600/);
          assert.match(authRes.body.url, /force_logout_login=true/);
          assert.match(authRes.body.url, /first_name=%22%22/);
          assert.match(authRes.body.url, /last_name=%22%22/);
          assert.match(authRes.body.url, /external_group_id=%22%22/);
          assert.doesNotMatch(authRes.body.url, /%22null%22|=null(?:&|$)/);

          const directSigned = createSignedUrl(
            "/embed/dashboards/1",
            {
              external_user_id: "minimalUser",
              permissions: ["access_data"],
              models: ["data_block_acs_bigquery"],
            },
            "example.looker.com",
            "embed-signing-secret-for-unit-tests"
          );
          assert.match(directSigned, /session_length=3600/);
          assert.match(directSigned, /force_logout_login=true/);

          for (const emptySessionLen of ["", null]) {
            const ssoRes = await requestJson(server, "POST", "/api/sso-url", {
              headers: authHeaders,
              body: {
                target_url: "/embed/dashboards/1",
                session_length: emptySessionLen,
              },
            });
            assert.equal(ssoRes.status, 200);
            assert.match(ssoRes.body.url, /session_length=3600/);
            assert.match(ssoRes.body.url, /first_name=%22%22/);
            assert.match(ssoRes.body.url, /last_name=%22%22/);
            assert.match(ssoRes.body.url, /external_group_id=%22%22/);
            assert.doesNotMatch(ssoRes.body.url, /%22null%22|=null(?:&|$)/);
          }

          const nonNumericSessionLen = await requestJson(
            server,
            "POST",
            "/api/sso-url",
            {
              headers: authHeaders,
              body: {
                target_url: "/embed/dashboards/1",
                session_length: false,
              },
            }
          );
          assert.equal(nonNumericSessionLen.status, 400);
        } finally {
          delete config.authenticatedUser.minimalUser;
        }
      },
    ],
    [
      "catches async route errors in withAuth and returns JSON 500 without crashing",
      async () => {
        config.authenticatedUser.throwingUser = {
          external_user_id: "throwingUser",
          get permissions() {
            throw new Error("Simulated unexpected route failure");
          },
          models: ["data_block_acs_bigquery"],
        };
        try {
          const token = createSessionToken("throwingUser", TEST_AUTH_SECRET, 3600);
          const res = await requestJson(
            server,
            "GET",
            "/api/auth?src=%2Fembed%2Fdashboards%2F1",
            { headers: { Authorization: `Bearer ${token}` } }
          );
          assert.equal(res.status, 500);
          assert.match(String(res.headers["content-type"]), /^application\/json/i);
          assert.equal(res.body.error, "Internal server error");

          let fallbackStatus = 0;
          let fallbackBody = null;
          const twoArgWrapped = apiRouter.withAuth(async () => {
            throw new Error("Two-arg invocation failure");
          });
          await twoArgWrapped(
            { headers: { Authorization: `Bearer ${token}` } },
            {
              setHeader() {},
              status(code) {
                fallbackStatus = code;
                return this;
              },
              send(payload) {
                fallbackBody = payload;
                return this;
              },
            }
          );
          assert.equal(fallbackStatus, 500);
          assert.deepEqual(fallbackBody, { error: "Internal server error" });
        } finally {
          delete config.authenticatedUser.throwingUser;
        }
      },
    ],
    [
      "validates 32-bit integer group_ids before checking group membership grants",
      async () => {
        config.authenticatedUser.groupUser = {
          external_user_id: "groupUser",
          first_name: "Group",
          last_name: "Tester",
          session_length: 3600,
          force_logout_login: true,
          external_group_id: "group_ext",
          group_ids: [10, 20],
          permissions: ["access_data"],
          models: ["data_block_acs_bigquery"],
        };
        try {
          const token = createSessionToken("groupUser", TEST_AUTH_SECRET, 3600);
          const authHeaders = { Authorization: `Bearer ${token}` };

          for (const invalidGroupIds of [[1.9], [5000000000], [-3000000000], ["10"]]) {
            const badRes = await requestJson(server, "POST", "/api/sso-url", {
              headers: authHeaders,
              body: {
                target_url: "/embed/dashboards/1",
                group_ids: invalidGroupIds,
              },
            });
            assert.equal(
              badRes.status,
              400,
              `Expected 400 for group_ids=${JSON.stringify(invalidGroupIds)}`
            );
          }

          const ungrantedRes = await requestJson(server, "POST", "/api/sso-url", {
            headers: authHeaders,
            body: {
              target_url: "/embed/dashboards/1",
              group_ids: [99],
            },
          });
          assert.equal(ungrantedRes.status, 403);

          const grantedSubsetRes = await requestJson(server, "POST", "/api/sso-url", {
            headers: authHeaders,
            body: {
              target_url: "/embed/dashboards/1",
              group_ids: [10],
            },
          });
          assert.equal(grantedSubsetRes.status, 200);
          assert.match(grantedSubsetRes.body.url, /group_ids=%5B10%5D/);
        } finally {
          delete config.authenticatedUser.groupUser;
        }
      },
    ],
    [
      "isolates login rate limits by (ip, username), resets on success, and ignores untrusted X-Forwarded-For",
      async () => {
        for (let i = 1; i <= 15; i += 1) {
          const rotRes = await requestJson(server, "POST", "/api/login", {
            headers: { "X-Forwarded-For": `198.51.100.${i}` },
            body: { username: "user1", password: "wrong-password" },
          });
          assert.equal(rotRes.status, 401);
        }

        const legitUser1Res = await requestJson(server, "POST", "/api/login", {
          headers: { "X-Forwarded-For": "203.0.113.50" },
          body: { username: "user1", password: TEST_USER1_PASSWORD },
        });
        assert.equal(legitUser1Res.status, 200);

        for (let i = 1; i <= 10; i += 1) {
          const unknownFail = await requestJson(server, "POST", "/api/login", {
            headers: { "X-Forwarded-For": "198.51.100.200" },
            body: { username: "unknown_candidate_user", password: "wrong-password" },
          });
          assert.equal(unknownFail.status, 401);
        }
        const unknownLimited = await requestJson(server, "POST", "/api/login", {
          headers: { "X-Forwarded-For": "198.51.100.200" },
          body: { username: "unknown_candidate_user", password: "wrong-password" },
        });
        assert.equal(unknownLimited.status, 429);

        for (let i = 1; i <= 10; i += 1) {
          const u1Fail = await requestJson(server, "POST", "/api/login", {
            headers: { "X-Forwarded-For": "198.51.100.201" },
            body: { username: "user1", password: "wrong-password" },
          });
          assert.equal(u1Fail.status, 401);
        }
        const u1Limited = await requestJson(server, "POST", "/api/login", {
          headers: { "X-Forwarded-For": "198.51.100.201" },
          body: { username: "user1", password: "wrong-password" },
        });
        assert.equal(u1Limited.status, 429);

        const u2SameIpOk = await requestJson(server, "POST", "/api/login", {
          headers: { "X-Forwarded-For": "198.51.100.201" },
          body: { username: "user2", password: TEST_USER2_PASSWORD },
        });
        assert.equal(u2SameIpOk.status, 200);

        for (let i = 1; i <= 5; i += 1) {
          const preResetFail = await requestJson(server, "POST", "/api/login", {
            headers: { "X-Forwarded-For": "198.51.100.202" },
            body: { username: "user1", password: "wrong-password" },
          });
          assert.equal(preResetFail.status, 401);
        }
        const resetLogin = await requestJson(server, "POST", "/api/login", {
          headers: { "X-Forwarded-For": "198.51.100.202" },
          body: { username: "user1", password: TEST_USER1_PASSWORD },
        });
        assert.equal(resetLogin.status, 200);
        for (let i = 1; i <= 6; i += 1) {
          const postResetFail = await requestJson(server, "POST", "/api/login", {
            headers: { "X-Forwarded-For": "198.51.100.202" },
            body: { username: "user1", password: "wrong-password" },
          });
          assert.equal(postResetFail.status, 401);
        }

        assert.equal(
          extractClientIp({
            socket: { remoteAddress: "198.51.100.77" },
            headers: { "x-forwarded-for": "203.0.113.9" },
            ip: "198.51.100.77",
          }),
          "198.51.100.77"
        );
        assert.equal(
          extractClientIp({
            socket: { remoteAddress: "127.0.0.1" },
            headers: { "x-forwarded-for": "203.0.113.9, 127.0.0.1" },
            ip: "203.0.113.9",
          }),
          "203.0.113.9"
        );
      },
    ],
    [
      "clamps out-of-range configured session_length consistently across JWT exp, Max-Age, and expires_in",
      async () => {
        config.userCredentials.ttlUser = "test-ttl-pass-2468";
        try {
          const scenarios = [
            [-5, 3600, "203.0.113.91"],
            [10, 60, "203.0.113.92"],
            [999999, 86400, "203.0.113.93"],
          ];
          for (const [configuredLen, expectedTtl, clientIp] of scenarios) {
            config.authenticatedUser.ttlUser = {
              external_user_id: "ttlUser",
              first_name: "Ttl",
              last_name: "User",
              session_length: configuredLen,
              force_logout_login: true,
              permissions: ["access_data"],
              models: ["data_block_acs_bigquery"],
            };
            const loginRes = await requestJson(server, "POST", "/api/login", {
              headers: { "X-Forwarded-For": clientIp },
              body: { username: "ttlUser", password: "test-ttl-pass-2468" },
            });
            assert.equal(loginRes.status, 200);
            assert.equal(loginRes.body.expires_in, expectedTtl);
            assert.equal(loginRes.body.profile.session_length, expectedTtl);

            const cookieHeader = loginRes.headers["set-cookie"][0];
            assert.match(cookieHeader, new RegExp(`Max-Age=${expectedTtl}(?:;|$)`));

            const rawToken = decodeURIComponent(
              cookieHeader.split(";", 1)[0].slice("pbl_session=".length)
            );
            const payloadB64 = rawToken.split(".")[1];
            const payloadJson = JSON.parse(
              Buffer.from(
                payloadB64.replace(/-/g, "+").replace(/_/g, "/"),
                "base64"
              ).toString("utf8")
            );
            assert.equal(payloadJson.exp - payloadJson.iat, expectedTtl);
          }
        } finally {
          delete config.authenticatedUser.ttlUser;
          delete config.userCredentials.ttlUser;
        }
      },
    ],
  ];

  let passed = 0;
  try {
    for (const [name, fn] of cases) {
      await fn();
      passed += 1;
      console.log(`PASS: ${name}`);
    }
    console.log(`\nAll ${passed} Backend-Node test suites passed.`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

runTests().catch((err) => {
  console.error("FAIL:", err);
  process.exit(1);
});
