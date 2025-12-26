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

// Embedded Explore Pages allow you to expose your modeled data to power users and allow users to create and save content in a highly curated experience within your application
// This file is used to embed an explore using LookerEmbedSDK with EmbedBuilder to initialize your connection and help create the iframe element

import React, { useCallback } from "react";
import { LookerEmbedSDK } from "@looker/embed-sdk";
import { PageTitle } from "../common/PageTitle";
import { LoadingSpinner } from "../common/LoadingSpinner";

/**
 * First initialized the embed sdk using the endpoint in /backend/routes/api.js
 * Gets explore with ID, can be found in the url by viewing the explore via your looker instance   */

const EmbedExplore = () => {
  const [loading, setLoading] = React.useState(true);
  /*
   Step 1 Initialization of the EmbedSDK happens when the user first access the application
   See App.js for reference
  */
  const createExplore = useCallback((el) => {
    if (!el) {
      return;
    }
    el.innerHTML = "";
    /*
      Step 2 Create your Explore through a simple set of chained methods
    */
    LookerEmbedSDK.createExploreWithId(
      "data_block_acs_bigquery/acs_census_data"
    )
      // adds the iframe to the DOM as a child of a specific element
      .appendTo(el)
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
    <>
      <div className="stuff" style={{ width: "100%", height: "calc(100% - 45px)" }}>
        <PageTitle text={"Embedded Explore"} />
        <LoadingSpinner loading={loading} />
        {/* Step 0 we have a simple container, which performs a callback to our createExplore function */}
        <div className="explore-container" ref={createExplore}></div>
      </div>
    </>
  );
};

export default EmbedExplore;
