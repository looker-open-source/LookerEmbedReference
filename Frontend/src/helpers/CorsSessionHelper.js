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

/*
  This file contains several methods to help with authentication.
  The SDK cannot call Looker unless it is initialized.  
  This file authenticates the SDK by getting an authorization token.
*/
import { Looker40SDK } from "@looker/sdk";
import { AuthToken, AuthSession, BrowserTransport, DefaultSettings } from "@looker/sdk-rtl";


class PblSession extends AuthSession {

  // This is a placeholder for the fetchToken function. It is modified to make it useful later.
  fetchToken() {
    return fetch("");
  }

  activeToken = new AuthToken();
  constructor(settings, transport) {
    super(settings, transport || new BrowserTransport(settings));
  }
  
  // This function checks to see if the user is already authenticated
  isAuthenticated() {
    const token = this.activeToken;
    if (!(token && token.access_token)) return false;
    return token.isActive();
  }

  // This function gets a new token
  async getToken() {
    if (!this.isAuthenticated()) {
      const token = await this.fetchToken();
      const res = await token.json()
      this.activeToken.setToken(res.user_token);
    }
    return this.activeToken;
  }

  // This function authenticates a user, which involves getting a new token
  // It returns a modified object with a new authorization header.
  async authenticate(props) {
    const token = await this.getToken();
    if (token && token.access_token) {
      props.mode = "cors";
      delete props.credentials;
      props.headers = {
        ...props.headers,
        Authorization: `Bearer ${this.activeToken.access_token}`
      };
    }
    return props;
  }
}

// This class sets the fetchToken to use the 'real' address of the backend server.
class PblSessionEmbed extends PblSession {
  fetchToken() {
    return fetch(
      // The token user is here set to be a Looker 'user1'
      // In real applications, you would pass the actual, 
      // logged in user to the backend instead.
      // The backend would then handle assigning appropriate permissions to the user.
      "/api/embed-user/token?id=user1"
    );
  }
}

// This creates a new session with the 'real' address used above
const session = new PblSessionEmbed({
  ...DefaultSettings,
  base_url: process.env.LOOKER_API_HOST
});

// This exports the SDK with the authenticated session
export const sdk = new Looker40SDK(session);