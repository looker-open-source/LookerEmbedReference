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

import React from "react";
import EmbedDashboard from "./components/EmbedDashboard/EmbedDashboard";
import EmbedExplore from "./components/EmbedExplore/EmbedExplore";
import VizComponent from "./components/VizComponent/VizComponent";
import VizComponentWFilter from "./components/VizComponent/VizComponentWFilter";
import EmbedQuery from "./components/EmbedQuery/EmbedQuery";
import EmbedDashboardEvents from "./components/EmbedDashboardEvents/EmbedDashboardEvents";
import "./App.css";
import TopBanner from "./components/Navigation/TopBanner";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

// import EmbedLookSDK from './components/EmbedLookSDK'
import { ComponentsProvider } from "@looker/components-providers";
import Container from "./RouteContainer";
import { Space } from "@looker/components";
import { NavigationMenu } from "./components/Navigation/NavigationMenu";
import { EmbedSDKInit } from "./components/common/EmbedInit";
import EmbedTwoIframes from "./components/EmbedTwoIframes/EmbedTwoIframes";
import EmbedDashboardLayout from "./components/EmbedDashboardLayout/EmbedDashboardLayout";
import EmbedDashboardDownload from "./components/EmbedDashboardDownload/EmbedDashboardDownload";
import SSOUrlTester from "./components/SSOUrlTester/SSOUrlTester";
import EmbedDashboardWFilters from "./components/EmbedDashboardWFilters/EmbedDashboardWFilters";

const routes = {
  title: "Embed Examples",
  examples: [
    {
      url: "/embed-dashboard",
      text: "Embedded Dashboard",
      component: <EmbedDashboard />,
      path: "EmbedDashboard/EmbedDashboard.js",
    },
    {
      url: "/embed-dashboard-with-filters",
      text: "Embedded Dashboard With Filters",
      component: <EmbedDashboardWFilters />,
      path: "EmbedDashboardWFilters/EmbedDashboardWFilters.js",
    },
    {
      url: "/embed-explore",
      text: "Embedded Explore",
      component: <EmbedExplore />,
      path: "EmbedExplore/EmbedExplore.js",
    },
    {
      url: "/embed-query",
      text: "Embedded Query",
      component: <EmbedQuery />,
      path: "EmbedQuery/EmbedQuery.js",
    },
    {
      url: "/viz-component",
      text: "Visualization Component",
      component: <VizComponent />,
      path: "VizComponent/VizComponent.js",
    },
    {
      url: "/viz-component-w-filter",
      text: "Visualization Component + Filter",
      component: <VizComponentWFilter />,
      path: "VizComponent/VizComponentWFilter.js",
    },
    {
      url: "/dashboard-events",
      text: "JavaScript Events",
      component: <EmbedDashboardEvents />,
      path: "EmbedDashboardEvents/EmbedDashboardEvents.js",
    },
    {
      url: "/multiple-embeds",
      text: "Multiple Embeds",
      component: <EmbedTwoIframes />,
      path: "EmbedTwoIframes/EmbedTwoIframes.js",
    },
    {
      url: "/dashboard-layout",
      text: "Dynamic Dashboard Layout",
      component: <EmbedDashboardLayout />,
      path: "EmbedDashboardLayout/EmbedDashboardLayout.js",
    },
    {
      url: "/dashboard-download",
      text: "Dashboard Download",
      component: <EmbedDashboardDownload />,
      path: "EmbedDashboardDownload/EmbedDashboardDownload.js",
    },
    {
      url: "/sso-url-tester",
      text: "SSO Embed URL Tester",
      component: <SSOUrlTester />,
      path: "SSOUrlTester/SSOUrlTester.js",
    },
    // Uncomment the code below to add an additional route to an embedded Look.
    // {
    //   url: '/embed-look',
    //   text: 'Embed Look',
    //   component:(<EmbedLookSDK />)
    // },
  ],
};

function App() {
  // Update the page height to have the app fit in viewport without scrolling

  const [menuToggle, setMenuToggle] = React.useState(true);
  // This code adds a Components Provider, which allows Looker components to be easily used later
  // It also adds a top banner, which includes navigation
  // It switches 'routes' based on the path and renders a 'Container' with the appropriate content

  /* 
    Calls EmbedSDK init() pointing the SDK to a looker host, a service to get the iframe URLs from, and passing user identifying information in the header
    no call to the auth service is made at this step
  */
  EmbedSDKInit();

  return (
    <ComponentsProvider>
      <Router>
        <TopBanner setMenuToggle={setMenuToggle} menuToggle={menuToggle} />
        <Space height="calc(100% - 80px)">
          <NavigationMenu menuToggle={menuToggle} routes={routes} />
          <Routes>
            <Route
              exact
              path="/"
              element={<Navigate replace to={routes.examples[0].url} />}
            />

            {routes.examples.map((e) => {
              return (
                <Route
                  path={e.url}
                  default
                  element={<Container content={e.component} path={e.path} />}
                  key={e.text}
                />
              );
            })}
          </Routes>
        </Space>
      </Router>
    </ComponentsProvider>
  );
}

export default App;
