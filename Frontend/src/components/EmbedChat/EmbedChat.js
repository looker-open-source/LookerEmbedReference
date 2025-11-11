// Copyright 2025 Google LLC
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

import React, { useCallback, useEffect } from "react";
import styled from "styled-components";
import { LookerEmbedSDK } from "@looker/embed-sdk";
import { Space, ButtonOutline } from "@looker/components";
import { PageTitle } from "../common/PageTitle";
import { LoadingSpinner } from "../common/LoadingSpinner";
import { Chat } from "./components/chat"

const EMPTY_FILTERS = {
  "State 📍":"",
  "County Name": "",
}

const EmbedChat = () => {
  const [loading, setLoading] = React.useState(true)
  const [dashboard, setDashboard] = React.useState()
  // State keeps track of the embedded dashboard's filters. The filters are hardcoded in this example. Follow the EmbedDashboardWFilters.js example for dynamic filters.
  const [filters, setFilters] = React.useState(EMPTY_FILTERS)

  // Set newly selected filter values in state, to pass as props to the chat.
  const handleDashboardFilterChange = (event) => {
    setFilters(event.dashboard.dashboard_filters)
  };

  // The chat will set the dashboard's filters with this callback.
  const setDashboardFilters = (filters) => {
    // Using the dashboard state, we are sending a message to the iframe to update the filters with the new values
    dashboard.send("dashboard:filters:update", {filters: filters});
    // Send "dashboard:run" message for the filter change to take effect
    dashboard.send("dashboard:run");
  }

  // Set the state of the dashboard so we can update filters and run
  const handleDashboardLoaded = dashboard => {
    setDashboard(dashboard);
    setLoading(false);
  };

  /*
   Step 2 Initialization of the EmbedSDK happens when the user first access the application
   See App.js for reference
  */

  const makeDashboard = useCallback(el => {
    if (!el) {
      return;
    }
    el.innerHTML = "";
    /*
      Step 3 Create your dashboard (or other piece of embedded content) through a simple set of chained methods
    */
    LookerEmbedSDK.createDashboardWithId("8fbA0wm0rZNykTcqwgywd6")
      // adds the iframe to the DOM as a child of a specific element
      .appendTo(el)
      // the .on() method allows us to listen for and respond to events inside the iframe. See here for a list of events: https://docs.looker.com/reference/embedding/embed-javascript-events
      .on("dashboard:filters:changed", handleDashboardFilterChange)
      // the .withTheme() applies a theme defined in the Looker instance
      .withTheme('Embed_CA_Workshop')
      // This line performs the call to the auth service to get the iframe's src='' url, places it in the iframe and the client performs the request to Looker
      .build()
      // this establishes event communication between the iframe and parent page
      .connect()
      .then(handleDashboardLoaded)
      // catch various errors which can occur in the process (note: does not catch 404 on content)
      .catch((error) => {
        console.error("An unexpected error occurred", error);
      });
  }, []);

  return (
    <Space height="100%" paddingBottom="20px">
      <div className={"embed-dashboard-main"}>
        <Space>
          <PageTitle text={"Embedded Dashboard with Conversational Analytics Chat"}/>
          <ButtonOutline
            onClick={() => setDashboardFilters(EMPTY_FILTERS)}
          >
            Reset filters
          </ButtonOutline>
        </Space>
        <Space height="calc(100% - 32px)">
          <LoadingSpinner loading={loading} />
          {/* Step 1 we have a simple container, which performs a callback to our makeDashboard function */}
          <Dashboard ref={makeDashboard}></Dashboard>
          <Chat 
            currentFilters={filters}
            setFilters={setDashboardFilters}
          />
        </Space>
      </div>
    </Space>
  );
};

// A little bit of style here for heights and widths.
const Dashboard = styled.div`
  width: 75%;
  height: 100%;
  & > iframe {
    width: 100%;
    height: 100%;
  }
`;
export default EmbedChat;
