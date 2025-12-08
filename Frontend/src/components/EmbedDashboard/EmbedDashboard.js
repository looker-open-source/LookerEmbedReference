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
import { LoadingSpinner } from "../common/LoadingSpinner";
import { Spinner } from "@looker/visualizations";

const EmbedDashboard = () => {
  const [loading, setLoading] = React.useState(true);
  /*
   Step 1 Initialization of the EmbedSDK happens when the user first access the application
   See App.js for reference
  */

  const makeDashboard = useCallback((el) => {
    if (!el) {
      return;
    }
    el.innerHTML = "";
    /*
      Step 2 Create your dashboard (or other piece of embedded content) through a simple set of chained methods
    */
    LookerEmbedSDK.createDashboardWithId(
      "data_block_acs_bigquery::acs_census_overview"
    )
      // adds the iframe to the DOM as a child of a specific element
      .appendTo(el)
      // the .on() method allows us to listen for and respond to events inside the iframe. See here for a list of events: https://docs.looker.com/reference/embedding/embed-javascript-events
      .on("dashboard:loaded", (e) => {
        console.log("LookerEmbedSDK.createDashboardWithId()::Successfully Loaded!");
      })
      // this line performs the call to the auth service to get the iframe's src='' url, places it in the iframe and the client performs the request to Looker
      .build()
      // this establishes event communication between the iframe and parent page
      .connect()
      .then(() => setLoading(false))
      // catch various errors which can occur in the process (note: does not catch 404 on content)
      .catch((error) => {
        console.error("An unexpected error occurred", error);
      });
  }, []);

  return (
    <Space height="calc(100% - 45px)">
      <div className={"embed-dashboard-main"}>
        <PageTitle text={"Embedded Dashboard"} />
        <LoadingSpinner loading={loading} />
        {/* Step 0) we have a simple container, which performs a callback to our makeDashboard function */}
        <div className="embed-dashboard" ref={makeDashboard} />
      </div>
    </Space>
  );
};

export default EmbedDashboard;
