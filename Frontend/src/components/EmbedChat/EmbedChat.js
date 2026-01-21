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

// This page component embeds a Conversational Analytics powered chat alongside an embedded dashboard. The page keeps track of the dashboard's filter's state for the chat, and the chat can control the dashboard's filters through this page. 

import React, { useCallback } from "react";
import { LookerEmbedSDK } from "@looker/embed-sdk";
import { Space, ButtonOutline, Span } from "@looker/components";
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
  
  // State to keep track of the embedded dashboard's filters. The filter's schema is hardcoded in this example. Follow the EmbedDashboardWFilters.js example for dynamic filters.
  const [filters, setFilters] = React.useState(EMPTY_FILTERS)

  /*
    Step 4: When the iframe emits the "dashboard:filters:changed" event, set the newly selected filter values in state to pass as props to the chat.
  */
  const handleDashboardFilterChange = (event) => {
    setFilters(event.dashboard.dashboard_filters)
  };

  /*
    Step 5: Enable the chat component to set the dashboard's filters with this callback 
  */
  const setDashboardFilters = (filters) => {
    // Sending a message to the iframe to update the filters with new values
    dashboard.send("dashboard:filters:update", {filters: filters});
    // Send "dashboard:run" message immediately after to re-run the queries with the new filters applied
    dashboard.send("dashboard:run");
  }

  // Set a reference to the embedded dashboard in state so can send it javascript events.
  const handleDashboardLoaded = dashboard => {
    setDashboard(dashboard);
    setLoading(false);
  };

  /*
    Step 1: Initialize the Embed SDK, which happens on application load.
    See App.js for reference
  */

  const makeDashboard = useCallback(el => {
    if (!el) {
      return;
    }
    el.innerHTML = "";
    /*
      Step 2 Create an embedded dashboard with the Embed SDK. See EmbedDashboard.js for reference
    */
    LookerEmbedSDK.createDashboardWithId("8fbA0wm0rZNykTcqwgywd6")
      .appendTo(el)
      /*
        Step 3 Listen to the "dashboard:filters:changed" event from the iframe. See here for a list of all events: https://docs.cloud.google.com/looker/docs/embedded-javascript-events#event_type_summary_table
      */
      .on("dashboard:filters:changed", handleDashboardFilterChange)
      // Apply the default "Looker" theme which displays the embedded dashboard's filter so the user can interact with the filters.
      .withTheme('Looker')
      .build()
      .connect()
      .then(handleDashboardLoaded)
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
          <Span>
            <i>
              This page only works with the Node backend
            </i>
          </Span>
        </Space>
        <Space height="calc(100% - 32px)">
          <LoadingSpinner loading={loading} />
          <div className="embed-dashboard-chat" ref={makeDashboard} />
          <Chat 
            currentFilters={filters}
            setFilters={setDashboardFilters}
          />
        </Space>
      </div>
    </Space>
  );
};

export default EmbedChat;
