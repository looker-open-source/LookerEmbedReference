// Copyright 2022 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
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
const sdk = LookerNodeSDK.init40();

var createSignedUrl = require("../auth/auth_utils");

/*****************************************
 * Authentication                        *
 *****************************************/

/**
 * Create an API auth token based on the provided embed user credentials
 */
router.get("/embed-user/token", async (req, res) => {
  const userCred = await sdk.ok(sdk.user_for_credential("embed", req.query.id));
  const embed_user_token = await sdk.login_user(userCred.id.toString());
  const u = {
    user_token: embed_user_token.value,
    token_last_refreshed: Date.now(),
  };
  res.json({ ...u });
});

/**
 * Update the embed users permissions
 */
router.post("/embed-user/:id/update", async (req, res) => {
  const userCred = await sdk.ok(
    sdk.user_for_credential("embed", req.params.id)
  );
  const attrs = {
    value: "Jeans",
  };
  await sdk.set_user_attribute_user_value(userCred.id, 23, attrs);
  res.json({ status: "updated" });
});

/**
 * Create a signed URL for embedding content
 */
const host = process.env.LOOKERSDK_EMBED_HOST; // Might need to be different than API baseurl (port nums)
const secret = process.env.LOOKERSDK_EMBED_SECRET;

router.get("/auth", (req, res) => {
  const src = req.query.src;
  const user = config.authenticatedUser[req.headers.usertoken];
  const url = createSignedUrl(src, user, host, secret);
  res.json({ url });
});

/**
 * Endpoint for signing an embed URL. Embed SSO parameters can be passed in as
 * part of the body
 */
router.post("/sso-url", async (req, res) => {
  const body = req.body;
  const targetUrl = body.target_url;
  const response = {
    url: createSignedUrl(targetUrl, body, host, secret),
  };
  res.setHeader("Content-Type", "application/json");
  res.status(200).send(response);
});

/****************************************
 * Backend Data API calls               *
 ****************************************/

/**
 * Get details of the current authenticated user
 */
router.get("/me", async (req, res, next) => {
  const me = await sdk.ok(sdk.me()).catch((e) => console.log(e));
  res.send(me);
});

/**
 * Get a list of all looks the authenticated user can access
 */
router.get("/looks", async (req, res, next) => {
  const looks = await sdk
    .ok(sdk.all_looks("id,title,embed_url,query_id"))
    .catch((e) => console.log(e));
  res.send(looks);
});

/**
 * Run the query associated with a look, and return that data as a json response
 */
router.get("/looks/:id", async (req, res, next) => {
  let target_look = req.params.id;
  let query_data = await sdk
    .ok(sdk.look(target_look, "query"))
    .catch((e) => console.log(e));
  delete query_data.query.client_id;

  let newQuery = await sdk
    .ok(sdk.create_query(query_data.query))
    .catch((e) => console.log(e));

  let newQueryResults = await sdk
    .ok(sdk.run_query({ query_id: Number(newQuery.id), result_format: "json" }))
    .catch((e) => {
      console.log(e);
      res.send({ error: e.message });
    });
  res.send(newQueryResults);
});

module.exports = router;
