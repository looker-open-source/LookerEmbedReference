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

import { LookerEmbedSDK } from "@looker/embed-sdk";

const AUTH_CONFIG = {
  // The backend service privately creates a signed URL using the verified
  // HttpOnly server-side session cookie rather than client-declared user headers.
  url: "/api/auth",
  withCredentials: true,
};

let initialized = false;

export const EmbedSDKInit = () => {
  if (!initialized) {
    LookerEmbedSDK.init(process.env.LOOKERSDK_EMBED_HOST, AUTH_CONFIG);
    initialized = true;
  }
};
