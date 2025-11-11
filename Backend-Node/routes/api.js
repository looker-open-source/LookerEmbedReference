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
const createSignedUrl = require("../auth/auth_utils");

const { DataChatServiceClient, DataAgentServiceClient } = require('@google-cloud/geminidataanalytics');
const conversationalAnalyticsSDK = new DataChatServiceClient()
const dataAgentSDK = new DataAgentServiceClient()
// const test = {
//   fields: {
//     title: {
//       stringValue: 'Total Population for Top 10 States',
//       kind: 'stringValue',
//     }
//   }
// }

// def _convert(v):
//   if isinstance(v, proto.marshal.collections.maps.MapComposite):
//     return {k: _convert(v) for k, v in v.items()}
//   elif isinstance(v, proto.marshal.collections.RepeatedComposite):
//     return [_convert(el) for el in v]
//   elif isinstance(v, (int, float, str, bool)):
//     return v
//   else:
//     return MessageToDict(v)



const AGENT_ID = process.env.CLOUD_AGENT_ID
const PROJECT_ID = process.env.CLOUD_PROJECT_ID
const PARENT_PATH = `projects/${PROJECT_ID}/locations/global`
const LOOKER_CLIENT = process.env.LOOKERSDK_CLIENT_ID
const LOOKER_SECRET = process.env.LOOKERSDK_CLIENT_SECRET

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
 * Backend Looker Data API calls               *
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

/*************************************************
 * Backend Conversational Analytics API calls    *
 *************************************************/

const SYSTEM_INSTRUCTION = `
- system_instruction: When asked about 'filter on dimension state.state_name being', limit response to where dimension 'state.state_name' equals provided values. When asked about 'filter on dimension county.county_name being', limit response to where dimension 'county.county_name' equals provided values.  
- glossaries:
    - glossary:
        - term: state.state_name
        - description: Maps to the dimension 'state.state_name'.
        - term: county.county_name
        - description: Maps to the dimension 'county.county_name'.
- additional_descriptions:
    - text: This agent will filter response or results on the provided dimensions.`

router.post("/patchagent", async (req, res, next) => {
  try {
    const response = await dataAgentSDK.updateDataAgent({
      updateMask: {
        paths: ["*"]
      },
      dataAgent: {
        dataAnalyticsAgent: {
          publishedContext: {
            systemInstruction: SYSTEM_INSTRUCTION,
            options: {
              chart: {
                image: {
                  svg: {}
                }
              }
            },
            datasourceReferences: {
              looker: {
                exploreReferences: [
                  {
                    lookmlModel: "data_block_acs_bigquery",
                    explore: "acs_census_data",
                    lookerInstanceUri: "https://8720823d-b429-43af-8577-70195bad34e3.looker.app/"
                  },
                  {
                    lookmlModel: "data_block_acs_bigquery",
                    explore: "congressional_district",
                    lookerInstanceUri: "https://8720823d-b429-43af-8577-70195bad34e3.looker.app/"
                  }
                ]
              }
            } 
          }
        },
        name: `${PARENT_PATH}/dataAgents/${AGENT_ID}`,
      },
    })

    res.send(response[0])
  } catch(e) {
    next(e)
  }
})

/**
 * Create new conversation
 */
router.post("/conversations", async (req, res, next) => {
  try {
    const response = await conversationalAnalyticsSDK.createConversation({
      parent: PARENT_PATH,
      conversation: { agents: [`${PARENT_PATH}/dataAgents/${AGENT_ID}`] }
    })

    const nameSplit = response[0].name.split("/")
    const id = nameSplit[nameSplit.length - 1]
    res.send(id)
  } catch(e) {
    next(e)
  }
});

/**
 * Get/list conversation's messages
 */
router.get("/messages/:id", async (req, res, next) => {
  try {
    const response = await conversationalAnalyticsSDK.listMessages({
      parent: `${PARENT_PATH}/conversations/${req.params.id}`,
      pageSize: 100,
    })

    res.send(response[0].map(storageMessage => storageMessage.message))
  } catch(e) {
    next(e)
  }
});

/**
 * Send message and stream response
 */
router.post("/chat", async (req, res, next) => {
  try {
    stream = await conversationalAnalyticsSDK.chat({
      parent: PARENT_PATH,
      conversationReference: {
        conversation: `${PARENT_PATH}/conversations/${req.body.conversationId}`,
        dataAgentContext: {
          dataAgent: `${PARENT_PATH}/dataAgents/${AGENT_ID}`,
          credentials: {
            oauth: {
              secret: {
                clientId: LOOKER_CLIENT,
                clientSecret: LOOKER_SECRET
              }
            }
          },
        }
      },
      messages: [{
        userMessage: { text: req.body.message }
      }],
    })


    stream.on("data", message => res.write(JSON.stringify(message)))
    stream.on("end", () => res.end())
    stream.on("error", e => next(e))
  } catch(e) {
    next(e)
  }
});



module.exports = router;
