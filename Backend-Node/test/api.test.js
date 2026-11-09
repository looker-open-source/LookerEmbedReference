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
const {
  createSessionToken,
  isPlaceholderValue,
  authenticateUserCredentials,
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
