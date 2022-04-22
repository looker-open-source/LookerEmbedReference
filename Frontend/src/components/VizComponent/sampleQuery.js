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

export const sampleQuery = 
    {
      model: 'data_block_acs_bigquery',
      view: 'acs_census_data',
      fields: ['blockgroup.total_pop', 'state.state_name'],
      sorts: ['blockgroup.total_pop desc'],
      limit: '500',
      filters: {
        "blockgroup.total_pop": "[0,50000000]"
      },
      column_limit: '50',
      vis_config:
      {
        show_view_names: false,
        show_row_numbers: true,
        transpose: false,
        truncate_text: true,
        hide_totals: false,
        hide_row_totals: false,
        size_to_fit: true,
        table_theme: 'white',
        limit_displayed_rows: false,
        enable_conditional_formatting: false,
        header_text_alignment: 'left',
        header_font_size: 12,
        rows_font_size: 12,
        conditional_formatting_include_totals: false,
        conditional_formatting_include_nulls: false,
        map_plot_mode: 'points',
        heatmap_gridlines: false,
        heatmap_gridlines_empty: false,
        heatmap_opacity: 0.5,
        show_region_field: true,
        draw_map_labels_above_data: true,
        map_tile_provider: 'light',
        map_position: 'custom',
        map_scale_indicator: 'off',
        map_pannable: true,
        map_zoomable: true,
        map_marker_type: 'circle',
        map_marker_icon_name: 'default',
        map_marker_radius_mode: 'proportional_value',
        map_marker_units: 'meters',
        map_marker_proportional_scale_type: 'linear',
        map_marker_color_mode: 'fixed',
        show_legend: true,
        quantize_map_value_colors: false,
        reverse_map_value_colors: false,
        type: 'looker_grid',
        custom_color_enabled: true,
        show_single_value_title: true,
        show_comparison: false,
        comparison_type: 'value',
        comparison_reverse_colors: false,
        show_comparison_label: true,
        defaults_version: 1,
        map_latitude: 43.53038025877379,
        map_longitude: -101.78489685058595,
        map_zoom: 4
      },
      dynamic_fields: '[{"category":"dimension","expression":"${state.state_name}","label":"State","value_format":null,"value_format_name":"","dimension":"state","_kind_hint":"dimension","_type_hint":"string"}]',
      has_table_calculations: false
    }