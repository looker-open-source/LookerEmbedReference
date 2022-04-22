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

/* This displays a visualization from the Visualization Components library.
 This only supports a limited number of visualization types. Find them here:
 https://docs.looker.com/data-modeling/extension-framework/vis-components
 It renders much faster than an Iframe embed!

 This example includes query creation, where it generates a new query. 

 The minimal example for a visualization component is just: 
  <Query sdk={sdk} query={123}>
    <Visualization>
  </Query
*/

import React, { useState, useEffect } from "react";
import { sdk } from "../../helpers/CorsSessionHelper";
import { Query, Visualization } from "@looker/visualizations";
import { Space } from "@looker/components";
import { sampleQuery } from "./sampleQuery";
import styled from "styled-components";
import { PageTitle } from "../common/PageTitle";

const EmbedComponent = (props) => {
  // Add a variables to state
  const [queryId, updateQueryId] = useState();

  // This creates a sample query to display.
  // This works well on any looker instance with the necessary lookML model (from the census block).
  // If you have a static query ID, you can use that instead of doing this extra step.
  useEffect(() => {
    sdk.ok(sdk.create_query(JSON.stringify(sampleQuery))).then((res) => {
      console.log(res);
      updateQueryId(res.id);
    });
    // The second argument to the effect is an array of elements to 'watch'.
    // An empty array like this makes the effect execute only once.
  }, []);

  return (
    <Space width="calc(100% - 15px)">
      <div className={"embed-dashboard-main"}>
        <PageTitle text={"Visualization Component"} />
        {queryId > 0 ? null : (
          <PageTitle>Generating a new query, please wait.</PageTitle>
        )}
        <Query sdk={sdk} query={queryId}>
          <Visualization />
        </Query>
      </div>
    </Space>
  );
};

export default EmbedComponent;
