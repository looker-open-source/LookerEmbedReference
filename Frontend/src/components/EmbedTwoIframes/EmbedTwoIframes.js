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
import {
  Accordion2,
  Accordion,
  AccordionDisclosure,
  Space,
} from "@looker/components";
//Alias an additional import of the embed sdk
import {
  LookerEmbedSDK,
  LookerEmbedSDK as LookerEmbedSDK2,
} from "@looker/embed-sdk";
import { PageTitle } from "../common/PageTitle";
import { LoadingSpinner } from '../common/LoadingSpinner'

const EmbedTwoIframes = () => {
  const [loading, setLoading] = React.useState(true)
  // Create a variable to hold the Embed Host
  const hostUrl = process.env.LOOKERSDK_EMBED_HOST;

  /*
   Step 1 Initialization of the EmbedSDK happens when the user first access the application
   See App.js for reference
  */

  /*
      NOTE - You only need to initialize the EmbedSDK once when displaying multiple embeds on a single page
   */

  const showVisualization = useCallback((el) => {
    if (!el) {
      return;
    }
    el.innerHTML = "";
    /*
        Step 2a Create your query visualization (or other piece of embedded content) through a simple set of chained methods
          - An embedded query is built by creating an explore with url, and passing in this special pattern:
             /embed/query/<<model>>/<<explore>>?qid=<<qid>> (the qid could be obtained from the API. This is the pattern used in this example)
          - OR the "expanded share url" giving you the ability to affect the vis config or really any attribute of the vis
             /embed/query/<<model>>/<<explore>>?fields=<<my field list with a new field>>&sorts=<<>> limit .... &vis_config=<<my vis config with a different vis type>>.....
          - Just also make sure to append &sdk=2&embed_domain=<<hostUrl>>&sandboxed_host=true to the end of the url too.
      */
    LookerEmbedSDK.createExploreWithUrl(
      `${hostUrl}/embed/query/data_block_acs_bigquery/acs_census_data?fields=state.state_name,blockgroup.total_pop&sorts=blockgroup.total_pop+desc&limit=10&column_limit=50&vis=%7B%22x_axis_gridlines%22%3Afalse%2C%22y_axis_gridlines%22%3Atrue%2C%22show_view_names%22%3Afalse%2C%22show_y_axis_labels%22%3Atrue%2C%22show_y_axis_ticks%22%3Atrue%2C%22y_axis_tick_density%22%3A%22default%22%2C%22y_axis_tick_density_custom%22%3A5%2C%22show_x_axis_label%22%3Afalse%2C%22show_x_axis_ticks%22%3Atrue%2C%22y_axis_scale_mode%22%3A%22linear%22%2C%22x_axis_reversed%22%3Afalse%2C%22y_axis_reversed%22%3Afalse%2C%22plot_size_by_field%22%3Afalse%2C%22trellis%22%3A%22%22%2C%22stacking%22%3A%22%22%2C%22limit_displayed_rows%22%3Afalse%2C%22legend_position%22%3A%22center%22%2C%22point_style%22%3A%22none%22%2C%22show_value_labels%22%3Atrue%2C%22label_density%22%3A25%2C%22x_axis_scale%22%3A%22auto%22%2C%22y_axis_combined%22%3Atrue%2C%22ordering%22%3A%22none%22%2C%22show_null_labels%22%3Afalse%2C%22show_totals_labels%22%3Afalse%2C%22show_silhouette%22%3Afalse%2C%22totals_color%22%3A%22%23808080%22%2C%22y_axes%22%3A%5B%7B%22label%22%3A%22%22%2C%22orientation%22%3A%22bottom%22%2C%22series%22%3A%5B%7B%22axisId%22%3A%22blockgroup.total_pop%22%2C%22id%22%3A%22blockgroup.total_pop%22%2C%22name%22%3A%22Total+Pop%22%7D%5D%2C%22showLabels%22%3Afalse%2C%22showValues%22%3Afalse%2C%22unpinAxis%22%3Afalse%2C%22tickDensity%22%3A%22default%22%2C%22tickDensityCustom%22%3A5%2C%22type%22%3A%22linear%22%7D%5D%2C%22series_types%22%3A%7B%7D%2C%22show_row_numbers%22%3Atrue%2C%22transpose%22%3Afalse%2C%22truncate_text%22%3Atrue%2C%22hide_totals%22%3Afalse%2C%22hide_row_totals%22%3Afalse%2C%22size_to_fit%22%3Atrue%2C%22table_theme%22%3A%22white%22%2C%22enable_conditional_formatting%22%3Afalse%2C%22header_text_alignment%22%3A%22left%22%2C%22header_font_size%22%3A12%2C%22rows_font_size%22%3A12%2C%22conditional_formatting_include_totals%22%3Afalse%2C%22conditional_formatting_include_nulls%22%3Afalse%2C%22map_plot_mode%22%3A%22points%22%2C%22heatmap_gridlines%22%3Afalse%2C%22heatmap_gridlines_empty%22%3Afalse%2C%22heatmap_opacity%22%3A0.5%2C%22show_region_field%22%3Atrue%2C%22draw_map_labels_above_data%22%3Atrue%2C%22map_tile_provider%22%3A%22light%22%2C%22map_position%22%3A%22custom%22%2C%22map_scale_indicator%22%3A%22off%22%2C%22map_pannable%22%3Atrue%2C%22map_zoomable%22%3Atrue%2C%22map_marker_type%22%3A%22circle%22%2C%22map_marker_icon_name%22%3A%22default%22%2C%22map_marker_radius_mode%22%3A%22proportional_value%22%2C%22map_marker_units%22%3A%22meters%22%2C%22map_marker_proportional_scale_type%22%3A%22linear%22%2C%22map_marker_color_mode%22%3A%22fixed%22%2C%22show_legend%22%3Atrue%2C%22quantize_map_value_colors%22%3Afalse%2C%22reverse_map_value_colors%22%3Afalse%2C%22type%22%3A%22looker_bar%22%2C%22custom_color_enabled%22%3Atrue%2C%22show_single_value_title%22%3Atrue%2C%22show_comparison%22%3Afalse%2C%22comparison_type%22%3A%22value%22%2C%22comparison_reverse_colors%22%3Afalse%2C%22show_comparison_label%22%3Atrue%2C%22defaults_version%22%3A1%2C%22map_latitude%22%3A43.53038025877379%2C%22map_longitude%22%3A-101.78489685058595%2C%22map_zoom%22%3A4%7D&filter_config=%7B%7D&origin=share-expanded&sdk=2&embed_domain=${hostUrl}&sandboxed_host=true`
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
  });

  const makeDashboard = useCallback((el) => {
    if (!el) {
      return;
    }
    el.innerHTML = "";
    /*
      Step 2b Create your dashboard (or other piece of embedded content) through a simple set of chained methods
    */
    LookerEmbedSDK.createDashboardWithId(
      "data_block_acs_bigquery::acs_census_overview"
    )
      // adds the iframe to the DOM as a child of a specific element
      .appendTo(el)
      // this instructs the SDK to point to the /dashboards-next/ version
      .withNext()
      // this line performs the call to the auth service to get the iframe's src='' url, places it in the iframe and the client performs the request to Looker
      .build()
      // this establishes event communication between the iframe and parent page
      .connect()
      // catch various errors which can occur in the process (note: does not catch 404 on content)
      .catch((error) => {
        console.error("An unexpected error occurred", error);
      });
  }, []);

  return (
    <>
      <PageTitle text={"Multiple Embeds"} />
      <LoadingSpinner loading={loading}/>
      <Accordion2 indicatorPosition="left" label="Dashboard">
        {/* Step 0b - we have a simple container, which performs a callback to our makeDashboard function */}
        <div className="dashboard-container-v2" ref={makeDashboard}></div>
      </Accordion2>
      <Accordion2 indicatorPosition="left" defaultOpen label="Query">
        {/* Step 0a - we have a simple container, which performs a callback to our showVisualization function */}
        <div className="query-container-v2" ref={showVisualization}></div>
      </Accordion2>
    </>
  );
};

export default EmbedTwoIframes;
