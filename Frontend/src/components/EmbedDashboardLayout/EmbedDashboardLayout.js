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

import React, { useCallback } from "react";
import styled from "styled-components";
//Alias an additional import of the embed sdk
import {
  LookerEmbedSDK,
  LookerEmbedSDK as LookerEmbedSDK2,
} from "@looker/embed-sdk";
import { ButtonItem, ButtonToggle } from "@looker/components";

// Additional js file that holds static values that will be used in this component
import { newLayoutComponents, defaultVisConfigs, blueVisConfigs } from "./constant";
import { PageTitle } from "../common/PageTitle";
import { LoadingSpinner } from "../common/LoadingSpinner";

const EmbedDashboardLayout = () => {
  const [loading, setLoading] = React.useState(true);
  const [dashboard, setDashboard] = React.useState();
  const [dashboardOptions, setDashboardOptions] = React.useState();
  const [originalLayout, setOriginalLayout] = React.useState();
  const [toggleSelection, setToggleSelection] = React.useState("Show Maps");
  const [toggleColorSelection, setToggleColorSelection] =
    React.useState("Default");

  // Runs after the "dashboard:loaded" event to initialize the Dashboard Options
  const initializeDashboardOptions = (event) => {
    setDashboardOptions(event.dashboard.options)
    setOriginalLayout(
      event.dashboard.options.layouts[0].dashboard_layout_components
    );
  };

  // Sets the dashboard state
  const setupDashboard = (dashboard) => {
    setDashboard(dashboard);
    setLoading(false);
  };

  // Hides all elements with map visualizations in the dashboard layout
  const hideMaps = () => {
    const newOptions = dashboardOptions;

    // Takes the list from the constant.js to update the options
    newOptions.layouts[0].dashboard_layout_components = newLayoutComponents;

    // Updates the dashboard options with the changes
    dashboard.setOptions(newOptions);
  };

  // Resets the dashboard layout to original layout with map visualizations
  const showMaps = () => {
    const newOptions = dashboardOptions;

    // Set to the initial layout
    newOptions.layouts[0].dashboard_layout_components = originalLayout;

    // Updates the dashboard options with the changes
    dashboard.setOptions(newOptions);
  };

  const updateDashboardColors = (color) => {
    const newOptions = { ...dashboardOptions };
    const newVisConfigs = color === "Blue" ? blueVisConfigs : defaultVisConfigs;

    // Update each element's vis_config fields with desired color 
    for (const elementId in newVisConfigs) {
      const newVisConfig = newVisConfigs[elementId];
      Object.assign(newOptions.elements[elementId].vis_config, newVisConfig)
    }

    // Updates the dashboard options with the changes
    dashboard.setOptions(newOptions);

    // Update color picker button toggle's state
    setToggleColorSelection(color);
  };

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

      // Adds the iframe to the DOM as a child of a specific element
      .appendTo(el)
      // Instructs the SDK to point to the /dashboards-next/ version
      .withNext()
      // Set event listener to store the dashboard's initial options when the dashboard loads
      .on("dashboard:loaded", initializeDashboardOptions)
      // Set an event listener to update our state with the dashboard's latest options when the dashboard finishes its queries
      .on("dashboard:run:complete", event => setDashboardOptions(event.dashboard.options))
      // Performs the call to the auth service to get the iframe's src='' url, places it in the iframe and the client performs the request to Looker
      .build()
      // Establishes event communication between the iframe and parent page
      .connect()
      // Sets up the dashboard after its built
      .then((x) => setupDashboard(x))
      // Catches various errors which can occur in the process (note: does not catch 404 on content)
      .catch((error) => {
        console.error("An unexpected error occurred", error);
      });
  }, []);

  return (
    <div height="calc(100% - 45px)">
      <PageTitle text={"Dashboard Layout"} />
      {/* Elements that contain the toggles for the Layouts and the vis_config color changes*/}
      <ToggleArea>
        <ButtonToggle value={toggleSelection} onChange={setToggleSelection}>
          <ButtonItem onClick={showMaps}>Show Maps</ButtonItem>
          <ButtonItem onClick={hideMaps}>Hide Maps</ButtonItem>
        </ButtonToggle>
        <ButtonToggle
          style={colorToggleStyle}
          value={toggleColorSelection}
          onChange={updateDashboardColors}
          nullable
        >
          <ButtonItem value="Default">
            <GreenIcon />
          </ButtonItem>
          <ButtonItem value="Blue">
            <BlueIcon />
          </ButtonItem>
        </ButtonToggle>
      </ToggleArea>
      <LoadingSpinner loading={loading} />
      {/* Step 0 - we have a simple container, which performs a callback to our makeDashboard function */}
      <Dashboard ref={makeDashboard}></Dashboard>
    </div>
  );
};

const colorToggleStyle = {
  marginLeft: "auto",
  marginRight: "40px",
};

const ToggleArea = styled.div`
  margin-top: 20px;
  margin-left: 20px;
  display: flex;
`;

const Dashboard = styled.div`
  width: 100%;
  height: calc(100% - 131px);
  & > iframe {
    width: 100%;
    height: 100%;
  }
`;
const BlueIcon = styled.span`
  background-color: rgb(87, 128, 205);
  width: 25px;
  height: 25px;
  border-radius: 50%;
`;

const GreenIcon = styled.span`
  background-color: #9bc779;
  width: 25px;
  height: 25px;
  border-radius: 50%;
`;

export default EmbedDashboardLayout;
