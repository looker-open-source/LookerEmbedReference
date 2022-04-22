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

/* config.js acts as single passthrough from root, so that backend package is self-contained */

var config = require('./monorepo')

require('dotenv').config()

/*
The following is two hard coded users with different permissions, which is intended to simulate how you would use identifying information
from the headers sent in EmbedSDK.init() to lookup a specific user from your database and grant their permissions / user attributes
*/
config.authenticatedUser = 
{ 
  user1: {
    //The external user ID should be a unique value from your system
    "external_user_id": "user1",
    "first_name": "Pat",
    "last_name": "Embed",
    "session_length": 3600,
    "force_logout_login": true,
    // The external_group_id is an arbitrary id, usually from an IdP
    // A folder is created for each external_group_id, for embed users to share content
    "external_group_id": "group1",
    "group_ids": [],
    // For available permissions see: https://docs.looker.com/reference/embedding/sso-embed#permissions
    // If the code here is 
    "permissions": [
      // access_data is necessary for every embed user.
      "access_data",
      // see_looks lets user view existing looks
      "see_looks",
      // see_user_dashboards lets users view existing dashboards 
      "see_user_dashboards",
      // explore lets users use the explore experience
      "explore",
      // save_content lets users save content
      // use it with 'explore' to allow the creation of new dashboards
      "save_content",
      // embed_broswe_spaces lets users navigate between folders to save content
      "embed_browse_spaces",
      // see_lookml_dashbaords lets users view existing 'LookML' dashboards
      // LookML dashboards are created by developers and version controlled
      "see_lookml_dashboards",
      // see_drill_overlay lets users drill into data
      "see_drill_overlay",
      // Allows users to open the schedule modal, and send email to non-embed Looker users
      "schedule_look_emails",
      // Allows embed users to schedule emails to themselves or other embed Looker users 
      "schedule_external_look_emails"
    ],
    // Models are mandatory; an emebd user can only see content and data using these models
    "models": ["data_block_acs_bigquery"],
    "user_attributes": { "locale": "en_US" }
  },
  user2: {
    "external_user_id": "user2",
    "first_name": "Jane",
    "last_name": "Doe",
    "session_length": 3600,
    "force_logout_login": true,
    "external_group_id": "group2",
    "group_ids": [],
    //user2 has reduced permissions
    "permissions": [
      "access_data",
      "see_looks",
      "see_user_dashboards",
      "see_lookml_dashboards"
    ],
    "models": ["data_block_acs_bigquery"],
    //user2 will be localized into a different language
    "user_attributes": { "locale": "es_US" }
  }
}

module.exports = config