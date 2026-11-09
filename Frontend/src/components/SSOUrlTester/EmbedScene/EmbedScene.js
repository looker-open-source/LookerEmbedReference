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

import React, { useEffect, useState } from "react";
import { Box, Heading, TextArea } from "@looker/components";

import { EmbedForm } from "./EmbedForm/EmbedForm";

const dashboardId = 1;

/**
 * Renders a form for dynamically embedding content within the authenticated user's grants
 */
export const EmbedScene = ({ session }) => {
  const profile = session?.profile || {};
  const [authRequest, setAuthRequest] = useState({
    target_url: `/embed/dashboards/${dashboardId}`,
    first_name: profile.first_name ?? "",
    last_name: profile.last_name ?? "",
    models: Array.isArray(profile.models) ? profile.models : [],
    permissions: Array.isArray(profile.permissions) ? profile.permissions : [],
    session_length: profile.session_length || 3600,
  });
  const [embedUrl, setEmbedUrl] = useState("");

  useEffect(() => {
    const nextProfile = session?.profile || {};
    setEmbedUrl("");
    setAuthRequest((prev) => ({
      ...prev,
      first_name: nextProfile.first_name ?? "",
      last_name: nextProfile.last_name ?? "",
      models: Array.isArray(nextProfile.models) ? nextProfile.models : [],
      permissions: Array.isArray(nextProfile.permissions)
        ? nextProfile.permissions
        : [],
      session_length: nextProfile.session_length || 3600,
    }));
  }, [session?.user, session?.profile]);

  return (
    <Box display="flex">
      <Box bg="background" padding="small" py="xlarge" width="25rem">
        <EmbedForm
          authRequest={authRequest}
          setAuthRequest={setAuthRequest}
          setEmbedUrl={setEmbedUrl}
          session={session}
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
