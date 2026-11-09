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

import React, { useState } from "react";
import {
  Box,
  Fieldset,
  FieldText,
  Form,
  Heading,
  MessageBar,
  Paragraph,
} from "@looker/components";

export function LoginForm({ onAuthenticated }) {
  const [username, setUsername] = useState("user1");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSubmitting(true);
    try {
      const resp = await fetch("/api/login", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok || !data.authenticated) {
        setErrorMessage(data.error || "Sign-in failed. Check backend credentials.");
        return;
      }
      onAuthenticated({
        user: data.user,
        profile: data.profile || null,
      });
    } catch (_err) {
      setErrorMessage("Unable to reach the backend authentication service.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      width="100%"
      py="xxlarge"
    >
      <Box
        width="26rem"
        p="large"
        border="1px solid #dee1e5"
        borderRadius="medium"
        bg="background"
      >
        <Heading as="h2" mb="xsmall">
          Sign in to Embed Reference
        </Heading>
        <Paragraph fontSize="small" color="text2" mb="medium">
          Authenticate with a user configured on the backend (for example,{" "}
          <code>user1</code> or <code>user2</code>).
        </Paragraph>
        {errorMessage && (
          <Box mb="medium">
            <MessageBar intent="critical" noActions>
              {errorMessage}
            </MessageBar>
          </Box>
        )}
        <Form onSubmit={handleSubmit}>
          <Fieldset>
            <FieldText
              label="Username"
              name="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            <FieldText
              label="Password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </Fieldset>
          <button
            type="submit"
            className="embed-form-submit-button"
            disabled={submitting}
          >
            {submitting ? "Signing in..." : "Sign in"}
          </button>
        </Form>
      </Box>
    </Box>
  );
}
