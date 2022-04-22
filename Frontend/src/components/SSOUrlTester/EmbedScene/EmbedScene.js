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

import React, { useState } from "react";
import { Box, Aside, Layout, Heading, TextArea } from "@looker/components";

import { EmbedForm } from "./EmbedForm/EmbedForm";

const dashboardId = 1;

/**
 * Renders a form for dynamically embedding content
 */
export const EmbedScene = () => {
  const [authRequest, setAuthRequest] = useState({
    target_url: `/embed/dashboards/${dashboardId}`,
    first_name: "",
    last_name: "",
    models: [],
    permissions: [],
    group_ids: [],
    session_length: 3600,
    force_logout_login: true,
  });
  const [embedUrl, setEmbedUrl] = useState("");

  return (
    <Box display="flex">
      <Box bg="background" padding="small" py="xlarge" width="25rem">
        <EmbedForm
          authRequest={authRequest}
          setAuthRequest={setAuthRequest}
          setEmbedUrl={setEmbedUrl}
        />
      </Box>
      <Box
        borderLeft="1px solid grey"
        marginLeft="medium"
        padding="medium"
        width="100%"
      >
        <Heading as="h3">Embed URL</Heading>
        <TextArea resize={false} disabled value={embedUrl} />
        <Heading py="medium" as="h3">
          Embed Preview
        </Heading>
        <Box boxShadow="0 0 2px 2px grey" height="80%">
          {embedUrl && (
            <iframe
              className="iframe"
              style={{ height: "100%", width: "100%" }}
              src={embedUrl}
            />
          )}
        </Box>
      </Box>
    </Box>
  );
};
