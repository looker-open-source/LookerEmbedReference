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

import {
  Box,
  FieldChips,
  FieldSelectMulti,
  Fieldset,
  FieldText,
  Form,
  Link,
  MessageBar,
} from "@looker/components";
import React, { useState } from "react";

const ALL_PERMISSION_OPTIONS = [
  { value: "access_data" },
  { value: "see_lookml_dashboards" },
  { value: "see_looks" },
  { value: "see_user_dashboards" },
  { value: "explore" },
  { value: "create_table_calculations" },
  { value: "save_content" },
  { value: "send_outgoing_webhook" },
  { value: "send_to_s3" },
  { value: "send_to_sftp" },
  { value: "schedule_look_emails" },
  { value: "schedule_external_look_emails" },
  { value: "send_to_integration" },
  { value: "create_alert" },
  { value: "download_with_limit" },
  { value: "download_without_limit" },
  { value: "see_sql" },
  { value: "see_drill_overlay" },
  { value: "embed_browse_spaces" },
];

/**
 * A form for submitting a dynamic URL signing request bounded to the authenticated user's grants
 */
export const EmbedForm = ({
  authRequest,
  setAuthRequest,
  setEmbedUrl,
  session,
}) => {
  const [errorMessage, setErrorMessage] = useState("");
  const allowedPermissions = session?.profile?.permissions;
  const permissionOptions =
    Array.isArray(allowedPermissions) && allowedPermissions.length > 0
      ? allowedPermissions.map((value) => ({ value }))
      : ALL_PERMISSION_OPTIONS;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    if (!Array.isArray(authRequest.models) || authRequest.models.length === 0) {
      setErrorMessage("Specify at least one allowed model.");
      return;
    }
    if (!Array.isArray(authRequest.permissions) || authRequest.permissions.length === 0) {
      setErrorMessage("Select at least one permission.");
      return;
    }

    try {
      const resp = await fetch("/api/sso-url", {
        method: "POST",
        credentials: "same-origin",
        body: JSON.stringify(authRequest),
        headers: {
          "Content-Type": "application/json",
        },
      });
      const body = await resp.json().catch(() => ({}));
      if (!resp.ok || !body.url) {
        setErrorMessage(body.error || "Signing the embed URL failed.");
        return;
      }
      setEmbedUrl(body.url);
    } catch (err) {
      console.error("Signing the url failed", err);
      setErrorMessage("Signing the embed URL failed.");
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const nextValue =
      name === "session_length" && value !== "" ? Number(value) : value;
    setAuthRequest({ ...authRequest, [name]: nextValue });
  };

  const handleArrayItemChange = (name, val) => {
    setAuthRequest({ ...authRequest, [name]: val });
  };

  return (
    <Form onSubmit={handleSubmit}>
      {errorMessage && (
        <Box mb="medium">
          <MessageBar intent="critical" noActions>
            {errorMessage}
          </MessageBar>
        </Box>
      )}
      <Fieldset legend="Embed Form">
        <FieldText
          label="Authenticated User (Server-Bound)"
          name="authenticated_user"
          value={session?.user || ""}
          disabled
        />
        <FieldText
          label="Embed Path"
          name="target_url"
          placeholder={authRequest.target_url}
          onChange={handleChange}
          value={authRequest.target_url}
          required
        />
        <FieldText
          name="first_name"
          label="First Name"
          value={authRequest.first_name}
          onChange={handleChange}
          required
        />
        <FieldText
          name="last_name"
          label="Last Name"
          value={authRequest.last_name}
          onChange={handleChange}
          required
        />
        <FieldChips
          label="Models (Subset of User Grant)"
          values={authRequest.models}
          onChange={handleArrayItemChange.bind(null, "models")}
        />
        <FieldSelectMulti
          label="Permissions (Subset of User Grant)"
          description={
            <>
              See documentation{" "}
              <Link
                href="https://docs.looker.com/reference/embedding/sso-embed#permissions"
                target="_blank"
              >
                here
              </Link>
            </>
          }
          width="100%"
          name="permissions"
          values={authRequest.permissions}
          options={permissionOptions}
          required
          onChange={handleArrayItemChange.bind(null, "permissions")}
        />
        <FieldText
          label="Session Length"
          name="session_length"
          value={authRequest.session_length}
          onChange={handleChange}
          type="number"
          required
        />
      </Fieldset>
      <button className="embed-form-submit-button">Submit</button>
    </Form>
  );
};
