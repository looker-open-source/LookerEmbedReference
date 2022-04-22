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

import { LookerEmbedSDK } from "@looker/embed-sdk"

  export const EmbedSDKInit = () => {
        LookerEmbedSDK.init(
            process.env.LOOKERSDK_EMBED_HOST,
            {
              // The location of the service which will privately create a signed URL
              url: '/api/auth'
              , headers: [
                // include some factor which your auth service can use to uniquely identify a user, so that a user specific url can be returned. This could be a token or ID
                { name: 'usertoken', value: 'user1' }
              ]
            }
          )
    }

