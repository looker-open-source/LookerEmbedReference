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

// Embedded dashboards let you build an interactive and highly curated data experience within your application
// This file is used to embed a dashboard using LookerEmbedSDK with EmbedBuilder to initialize your connection and help create the iframe element

import React, { useCallback } from "react";
import styled from "styled-components";
import { LookerEmbedSDK } from "@looker/embed-sdk";
import { Space } from "@looker/components";
import { PageTitle } from "../common/PageTitle";
import { EmbedScene } from "./EmbedScene/EmbedScene";

const SSOUrlTester = () => {
  return (
    <Space>
      <div className={"embed-dashboard-main"}>
        <PageTitle text={"SSO Embed URL Tester"} />
        <EmbedScene />
      </div>
    </Space>
  );
};

export default SSOUrlTester;
