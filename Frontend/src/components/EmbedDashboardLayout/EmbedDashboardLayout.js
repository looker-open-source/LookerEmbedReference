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
import { newLayoutComponents, bluePallette, defaultPallette } from "./constant";
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
  const [dashboardElements, setDashboardElements] = React.useState();

  // Function that runs after the "dashboard:run:complete event that initializes the Dashboard Options
  const initializeDashboardOptions = (event) => {
    // Checks if this is the initial dashboard load
    if (!originalLayout) {
      // Set original elements
      setDashboardElements(event.dashboard.options.elements);
      // Set original layout
      setOriginalLayout(
        event.dashboard.options.layouts[0].dashboard_layout_components
      );
      console.log(event.dashboard.options);
    }
    // Sets dashboard options for everytime the "dashboard:run:complete" event is triggered
    setDashboardOptions(event.dashboard.options);
  };

  // Sets the dashboard state
  const setupDashboard = (dashboard) => {
    setDashboard(dashboard);
    setLoading(false);
  };

  // Function that hides the elements that have map visualizations in the dashboard layout
  const hideMaps = () => {
    const newOptions = dashboardOptions;
    // Takes the list from the constant.js to update the options
    newOptions.layouts[0].dashboard_layout_components = newLayoutComponents;
    // Updates the dashboard options with the changes
    dashboard.setOptions(newOptions);
  };

  // Function that shows the initial layout
  const showMaps = () => {
    const newOptions = dashboardOptions;
    // Takes from the originalLayout state
    newOptions.layouts[0].dashboard_layout_components = originalLayout;
    // Updates the dashboard options with the changes
    dashboard.setOptions(newOptions);
  };

  const updateDashboardColors = (color) => {
    const newOptions = { ...dashboardOptions };
    console.log("new options", newOptions);
    if (color === "Blue") {
      // Loops through the bluePallete variable and updates the vis_config for each element
      bluePallette.forEach((b) => {
        const keys = Object.keys(b.vis_config);
        keys.forEach((k) => {
          const value = b.vis_config[k];
          newOptions.elements[b.id].vis_config[k] = value;
        });
      });
      // Updates the dashboard options with the changes
      dashboard.setOptions(newOptions);
    } else if (color === "Default") {
      // Loops through the defaultPallette variable and updates the vis_config for each element
      defaultPallette.forEach((b) => {
        const keys = Object.keys(b.vis_config);
        keys.forEach((k) => {
          const value = b.vis_config[k];
          console.log(b.id);
          newOptions.elements[b.id].vis_config[k] = value;
        });
      });
      // Updates the dashboard options with the changes
      dashboard.setOptions(newOptions);
    }
    // Update the controlled state for the color picker button toggle
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

      // adds the iframe to the DOM as a child of a specific element
      .appendTo(el)
      // this instructs the SDK to point to the /dashboards-next/ version
      .withNext()
      // this is an event listener for when the dashboard is finished running
      .on("dashboard:run:complete", initializeDashboardOptions)
      // this line performs the call to the auth service to get the iframe's src='' url, places it in the iframe and the client performs the request to Looker
      .build()
      // this establishes event communication between the iframe and parent page
      .connect()
      // this line sets up the dashboard after the building is complete
      .then((x) => setupDashboard(x))
      // catch various errors which can occur in the process (note: does not catch 404 on content)
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
