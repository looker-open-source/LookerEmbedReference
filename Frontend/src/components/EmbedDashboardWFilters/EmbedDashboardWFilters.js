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

import React, { useCallback, useEffect } from "react";
import styled from "styled-components";
import { LookerEmbedSDK } from "@looker/embed-sdk";
import { Space, SpaceVertical } from "@looker/components";
import { PageTitle } from "../common/PageTitle";
import { LoadingSpinner } from "../common/LoadingSpinner";
import { sdk } from "../../helpers/CorsSessionHelper";
import {
  Filter,
  i18nResources,
  ComponentsProvider,
  useSuggestable,
  useExpressionState,
} from "@looker/filter-components";

const EmbedDashboardWFilters = () => {
  const [loading, setLoading] = React.useState(true);
  const [dashboard, setDashboard] = React.useState();

  // State for all the available filters for the embedded dashboard
  const [dashboardFilters, setDashboardFilters] = React.useState();

  // State for the filter values, selected by the filter components located outside the embedded dashboard
  const [filterValues, setFilterValues] = React.useState({});

  // Looker API call using the API SDK to get all the available filters for the embedded dashboard
  useEffect(() => {
    const initialize = async () => {
      const filters = await sdk.ok(
        sdk.dashboard(
          "data_block_acs_bigquery::acs_census_overview",
          "dashboard_filters"
        )
      );
      setDashboardFilters(filters["dashboard_filters"]);
    };
    initialize();
  }, []);

  // Set the new selected filter values in state, when selected using the components outside the dashboard
  const handleFilterChange = (newFilterValue, filterName) => {
    // Using the dashboard state, we are sending a message to the iframe to update the filters with the new values
    dashboard.send("dashboard:filters:update", {
      filters: {
        [filterName]: newFilterValue,
      },
    });
    // The "dashboard:run" message has to be sent for the filter change to take effect
    dashboard.send("dashboard:run");
  };

  // Set the state of the dashboard so we can update filters and run
  const handleDashboardLoaded = (dashboard) => {
    setDashboard(dashboard);
    setLoading(false);
  };

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
      // this line performs the call to the auth service to get the iframe's src='' url, places it in the iframe and the client performs the request to Looker
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
    <Space height="calc(100% - 45px)">
      <div className={"embed-dashboard-main"}>
        <PageTitle text={"Embedded Dashboard With Filters"} />
        <LoadingSpinner loading={loading} />
        <ComponentsProvider resources={i18nResources}>
          <Space m="u3" align="end" width="auto">
            {dashboardFilters?.map((filter) => {
              return (
                <DashFilters
                  filter={filter}
                  expression={filterValues[filter.name]}
                  onChange={(event) => handleFilterChange(event, filter.name)}
                  key={filter.id}
                />
              );
            })}
          </Space>
        </ComponentsProvider>
        {/* Step 0) we have a simple container, which performs a callback to our makeDashboard function */}
        <Dashboard ref={makeDashboard}></Dashboard>
      </div>
    </Space>
  );
};

// A little bit of style here for heights and widths.
const Dashboard = styled.div`
  width: 100%;
  height: calc(100% - 110px);
  & > iframe {
    width: 100%;
    height: 100%;
  }
`;
export default EmbedDashboardWFilters;

// This utilizes the more custom implementation of Looker filter components described in the filter components documentation.
// Refer to the Looker filter components documentation for more details:
// https://github.com/looker-open-source/components/blob/HEAD/packages/filter-components/USAGE.md
export const DashFilters = ({ filter, expression, onChange }) => {
  const stateProps = useExpressionState({
    filter,
    // These props will likely come from higher up in your application
    expression,
    onChange,
  });

  const { suggestableProps } = useSuggestable({
    filter,
    sdk,
  });

  const FilterLabel = styled.span`
    font-family: inherit;
    margin: 0px;
    padding: 0px;
    color: rgb(64, 70, 75);
    font-size: 0.75rem;
    font-weight: 500;
    padding-bottom: 0.25rem;
  `;

  return (
    <SpaceVertical gap="u0" width="auto">
      <FilterLabel>{filter.name}</FilterLabel>
      <Filter
        name={filter.name}
        type={filter.type}
        config={{ type: "dropdown_menu" }}
        {...suggestableProps}
        {...stateProps}
      />
    </SpaceVertical>
  );
};
