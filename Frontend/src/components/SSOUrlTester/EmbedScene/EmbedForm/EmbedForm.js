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

import {
  FieldChips,
  FieldSelectMulti,
  Fieldset,
  FieldText,
  Form,
  Link,
} from "@looker/components";
import React, { useState } from "react";
import styled from "styled-components"

/**
 * A form for submitting a dynamic URL signing request the backend
 * @param authRequest A collection of embed parameters required for URL signing
 * @param setAuthRequest A state dispatch function for setting authRequest
 * @param setEmbedUrl A state dispatch function for storing the signed embed url
 * @constructor
 */
export const EmbedForm = ({ authRequest, setAuthRequest, setEmbedUrl }) => {
  const [permissionsValidationMsg, setPermissionsValidationMsg] = useState("");
  const [errors, setErrors] = useState(false);

  const validatePermissions = () => {
    if (Object.keys(authRequest.permissions).length === 0) {
      setPermissionsValidationMsg("This is a required field.");
    }
  };

  const validate = () => {
    validatePermissions();
    if (permissionsValidationMsg) setErrors(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    validate();

    if (!errors) {
      try {
        const resp = await fetch("/api/sso-url", {
          method: "POST",
          body: JSON.stringify(authRequest),
          headers: {
            "Content-Type": "application/json",
          },
        });
        const body = await resp.json();
        setEmbedUrl(body.url);
      } catch (e) {
        console.error("Signing the url failed", e);
      }
    }
  };

  const handleChange = (e) => {
    setAuthRequest({ ...authRequest, [e.target.name]: e.target.value });
  };

  const handleArrayItemChange = (name, val) => {
    setAuthRequest({ ...authRequest, [name]: val });
  };

  return (
    <Form onSubmit={handleSubmit}>
      <Fieldset legend="Embed Form">
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
        <FieldText
          name="external_user_id"
          label="External User Id"
          onChange={handleChange}
          required
        />
        <FieldChips
          label="Models"
          values={authRequest.models}
          onChange={handleArrayItemChange.bind(null, "models")}
        />
        <FieldChips
          label="Group Ids"
          values={authRequest.group_ids}
          onChange={handleArrayItemChange.bind(null, "group_ids")}
        />
        <FieldSelectMulti
          label="Permissions"
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
          options={[
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
            { value: "send_to_integration" },
            { value: "create_alert" },
            { value: "download_with_limit" },
            { value: "download_without_limit" },
            { value: "see_sql" },
            { value: "see_drill_overlay" },
            { value: "embed_browse_spaces" },
          ]}
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
      <Button>Submit</Button>
    </Form>
  );
};

const Button = styled.button`
background: rgb(26, 115, 232); 
border: 1px solid rgb(66, 133, 244);
padding: 0px 1.5rem;
-webkit-box-align: center;
align-items: center;
border-radius: 5px; 
cursor: pointer;
font-weight: 500;
-webkit-box-pack: center;
justify-content: center;
line-height: 1;
font-size: 0.875rem;
height: 36px;
color:white;
`
