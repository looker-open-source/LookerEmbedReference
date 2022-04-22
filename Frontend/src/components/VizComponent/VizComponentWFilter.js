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
 The query is based on a sample query, stored in the sampleQuery.js file.
 It also includes a slider, which can be used to select a range of population.
 Every interaction with the slider changes the React state, and that triggers 
 a React effect.  The effect calls the Looker API call to create a new query.  

 The fastest, minimal example for a visualization component is just: 
  <Query sdk={sdk} query={123}>
    <Visualization>
  </Query

*/

import React, { useState, useEffect } from "react";
import { sdk } from "../../helpers/CorsSessionHelper";
import { Query, Visualization } from "@looker/visualizations";
import { Space, SpaceVertical, FieldRangeSlider } from "@looker/components";
import { sampleQuery } from "./sampleQuery";
import styled from "styled-components";
import { PageTitle } from "../common/PageTitle";

const EmbedComponent = (props) => {
  // Add 2 variables to state, so that the user controls the population passed in the query
  const [queryId, updateQueryId] = useState();
  const [populationFilter, updatePopulationFilter] = useState([0, 500000000]);

  // This creates a sample query to display.
  // This works well on any looker instance with the necessary lookML model (from the census block).
  // If you have a static query ID, you can use that instead of doing this extra step.
  useEffect(() => {
    sampleQuery.filters["blockgroup.total_pop"] =
      JSON.stringify(populationFilter);
    sdk
      .ok(sdk.create_query(JSON.stringify(sampleQuery), "id"))
      .then((res) => updateQueryId(res.id));
    // The second argument to the effect is an array of elements to 'watch'.
    // A single variable makes the effect run when the populationFilter changes.
  }, [populationFilter]);

  return (
    <Space width="calc(100% - 15px)">
      <div className={"embed-dashboard-main"}>
        <SpaceVertical gap={"large"}>
          <PageTitle text={"Visualization Component With Filter"} />
          <FieldRangeSlider
            label={"Population Filter:"}
            min={0}
            max={50000000}
            step={500000}
            width={500}
            onChange={updatePopulationFilter}
          />
          <Query sdk={sdk} query={queryId}>
            <Visualization />
          </Query>
        </SpaceVertical>
      </div>
    </Space>
  );
};

export default EmbedComponent;
