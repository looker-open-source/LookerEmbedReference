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

import React, { useEffect, useMemo, useState } from "react";
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
import { LoginForm } from "./components/Auth/LoginForm";
import { LoadingSpinner } from "./components/common/LoadingSpinner";
import { resetEmbedApiSession } from "./helpers/CorsSessionHelper";

function buildRoutes(session) {
  return {
    title: "Embed Examples",
    examples: [
      {
        url: "/embed-dashboard",
        text: "Embedded Dashboard",
        component: <EmbedDashboard />,
        path: "EmbedDashboard/EmbedDashboard.js",
        codeFileName: "EmbedDashboard",
      },
      {
        url: "/embed-dashboard-with-filters",
        text: "Embedded Dashboard With Filters",
        component: <EmbedDashboardWFilters />,
        path: "EmbedDashboardWFilters/EmbedDashboardWFilters.js",
        codeFileName: "EmbedDashboardWFilters",
      },
      {
        url: "/embed-explore",
        text: "Embedded Explore",
        component: <EmbedExplore />,
        path: "EmbedExplore/EmbedExplore.js",
        codeFileName: "EmbedExplore",
      },
      {
        url: "/embed-query",
        text: "Embedded Query",
        component: <EmbedQuery />,
        path: "EmbedQuery/EmbedQuery.js",
        codeFileName: "EmbedQuery",
      },
      {
        url: "/viz-component",
        text: "Visualization Component",
        component: <VizComponent />,
        path: "VizComponent/VizComponent.js",
        codeFileName: "VizComponent",
      },
      {
        url: "/viz-component-w-filter",
        text: "Visualization Component + Filter",
        component: <VizComponentWFilter />,
        path: "VizComponent/VizComponentWFilter.js",
        codeFileName: "VizComponentWFilter",
      },
      {
        url: "/dashboard-events",
        text: "JavaScript Events",
        component: <EmbedDashboardEvents />,
        path: "EmbedDashboardEvents/EmbedDashboardEvents.js",
        codeFileName: "EmbedDashboardEvents",
      },
      {
        url: "/multiple-embeds",
        text: "Multiple Embeds",
        component: <EmbedTwoIframes />,
        path: "EmbedTwoIframes/EmbedTwoIframes.js",
        codeFileName: "EmbedTwoIframes",
      },
      {
        url: "/dashboard-layout",
        text: "Dynamic Dashboard Layout",
        component: <EmbedDashboardLayout />,
        path: "EmbedDashboardLayout/EmbedDashboardLayout.js",
        codeFileName: "EmbedDashboardLayout",
      },
      {
        url: "/dashboard-download",
        text: "Dashboard Download",
        component: <EmbedDashboardDownload />,
        path: "EmbedDashboardDownload/EmbedDashboardDownload.js",
        codeFileName: "EmbedDashboardDownload",
      },
      {
        url: "/sso-url-tester",
        text: "SSO Embed URL Tester",
        component: <SSOUrlTester session={session} />,
        path: "SSOUrlTester/SSOUrlTester.js",
        codeFileName: "SSOUrlTester",
      },
    ],
  };
}

function App() {
  const [menuToggle, setMenuToggle] = useState(true);
  const [session, setSession] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/session", { credentials: "same-origin" })
      .then(async (resp) => {
        if (!resp.ok) return null;
        return resp.json();
      })
      .then((data) => {
        if (cancelled) return;
        if (data && data.authenticated) {
          setSession({ user: data.user, profile: data.profile || null });
        } else {
          resetEmbedApiSession();
        }
      })
      .catch(() => {
        if (!cancelled) {
          resetEmbedApiSession();
        }
      })
      .finally(() => {
        if (!cancelled) {
          setCheckingSession(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const routes = useMemo(() => buildRoutes(session), [session]);

  if (session) {
    EmbedSDKInit();
  }

  const handleAuthenticated = (nextSession) => {
    resetEmbedApiSession();
    setSession(nextSession);
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/logout", {
        method: "POST",
        credentials: "same-origin",
      });
    } finally {
      resetEmbedApiSession();
      setSession(null);
    }
  };

  return (
    <ComponentsProvider>
      <Router>
        <TopBanner
          setMenuToggle={session ? setMenuToggle : undefined}
          menuToggle={menuToggle}
          currentUser={session?.user}
          onLogout={session ? handleLogout : undefined}
        />
        {checkingSession ? (
          <LoadingSpinner loading={true} />
        ) : !session ? (
          <LoginForm onAuthenticated={handleAuthenticated} />
        ) : (
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
                    element={<Container content={e.component} path={e.codeFileName} />}
                    key={e.text}
                  />
                );
              })}
            </Routes>
          </Space>
        )}
      </Router>
    </ComponentsProvider>
  );
}

export default App;
