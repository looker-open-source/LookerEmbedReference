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

export const newLayoutComponents = [
  {
    // Total Population
    id: "9a25e5117861811d218574501b928d08",
    dashboard_layout_id: null,
    dashboard_element_id: "9a25e5117861811d218574501b928d08",
    row: 0,
    column: 5,
    width: 14,
    height: 3,
    deleted: false,
  },
  {
    // Gender
    id: "ebd76278739d31315c13830811819f8a",
    dashboard_layout_id: null,
    dashboard_element_id: "ebd76278739d31315c13830811819f8a",
    row: 3,
    column: 0,
    width: 8,
    height: 10,
    deleted: false,
  },
  {
    // Race
    id: "706a0bdd8337601d7b80280ee230776e",    
    dashboard_layout_id: null,
    dashboard_element_id: "706a0bdd8337601d7b80280ee230776e",
    row: 22,
    column: 0,
    width: 12,
    height: 9,
    deleted: false,
  },
  {
    //Education
    id: "f6c7c27e725dde95253579346d066559",
    dashboard_layout_id: null,
    dashboard_element_id: "f6c7c27e725dde95253579346d066559",
    row: 3,
    column: 8,
    width: 8,
    height: 10,
    deleted: false,
  },
  {
    // Percent of Income Spent on Rent by State
    id: "41364e74cdb03c2032cbc3b62920febf",
    dashboard_layout_id: null,
    dashboard_element_id: "41364e74cdb03c2032cbc3b62920febf",
    row: 3,
    column: 16,
    width: 8,
    height: 10,
    deleted: false,
  },
  {
    // Household Median Income & Per-Capita Income by State
    id: "ab6f1f15fc742936f24af78decbd5455",
    dashboard_layout_id: null,
    dashboard_element_id: "ab6f1f15fc742936f24af78decbd5455",
    row: 31,
    column: 12,
    width: 12,
    height: 9,
    deleted: false,
  },
  {
    // Commute Time Vs Median Income by County
    id: "4b335db099c6968389af8a69fea1144b",
    dashboard_layout_id: null,
    dashboard_element_id: "4b335db099c6968389af8a69fea1144b",
    row: 22,
    column: 12,
    width: 12,
    height: 9,
    deleted: false,
  },
  {
    // Employed Vs Unemployed Population by State
    id: "ba563b0321362ca45873a5b1ad9f3ef0",
    dashboard_layout_id: null,
    dashboard_element_id: "ba563b0321362ca45873a5b1ad9f3ef0",
    row: 13,
    column: 0,
    width: 12,
    height: 9,
    deleted: false,
  },
];

export const bluePallette = [
  {
    id: "9a25e5117861811d218574501b928d08",
    vis_config: {
      custom_color: "#4276BE",
    },
  },
  {
    id: "ebd76278739d31315c13830811819f8a",
    vis_config: {
      series_colors: {
        "blockgroup.female_pop": "#0a1159",
        "blockgroup.male_pop": "#4276BE",
      },
    },
  },
  {
    id: "41364e74cdb03c2032cbc3b62920febf",
    vis_config: {
      series_colors: {
        "blockgroup.white_pop": "#0a1159",
        "blockgroup.hispanic_pop": "#4276BE",
        "blockgroup.black_pop": "#5188bf",
        "blockgroup.asian_pop": "#7bb2de",
        "blockgroup.amerindian_pop": "#94c8eb",
        "blockgroup.other_race_pop": "#b3e2f7",
      },
    },
  },
  {
    id: "f6c7c27e725dde95253579346d066559",
    vis_config: {
      series_colors: {
        "blockgroup.masters_degree": "#0a1159",
        "blockgroup.bachelors_degree": "#4276BE",
        "blockgroup.associates_degree": "#5188bf",
        "blockgroup.one_year_more_college": "#7bb2de",
        "blockgroup.less_one_year_college": "#94c8eb",
        "blockgroup.high_school_diploma": "#b3e2f7",
      },
    },
  },
  {
    id: "706a0bdd8337601d7b80280ee230776e",
    vis_config: {
      series_colors: {
        "state.state_percent_income_spent_on_rent": "#0a1159",
        "state.state_median_income": "#7bb2de",
      },
    },
  },
  {
    id: "ab6f1f15fc742936f24af78decbd5455",
    vis_config: {
      series_colors: {
        "state.state_median_income": "#0a1159",
        "state.state_income_per_capita": "#5188bf",
      },
    },
  },
  {
    id: "ba563b0321362ca45873a5b1ad9f3ef0",
    vis_config: {
      series_colors: {
        "blockgroup.employed_pop": "#5188bf",
        "blockgroup.unemployed_pop": "#0a1159",
      },
    },
  },
  {
    id: "ab158b5edf21673cf2ce22f9f5fc33f0",
    vis_config: {
      map_value_colors: ["#0a1159", "#b3e2f7"],
    },
  },
  {
    id: "1e129b695870a7212f35b9c4eb2fe7c7",
    vis_config: {
      map_value_colors: ["#0a1159", "#b3e2f7"],
    },
  },
  {
    id: "42e1631e732bd16c5f647511f986d6b6",
    vis_config: {
      map_value_colors: ["#0a1159", "#b3e2f7"],
    },
  },
  {
    id: "74385e207fdf4e7b12c9036719ac762b",
    vis_config: {
      map_value_colors: ["#0a1159", "#b3e2f7"],
    },
  },
  {
    id: "d3db31621cb046736c7a37ebd46fb312",
    vis_config: {
      map_value_colors: ["#0a1159", "#b3e2f7"],
    },
  },
];

export const defaultPallette = [
  {
    id: "ab158b5edf21673cf2ce22f9f5fc33f0",
    vis_config: {
      map_value_colors: [],
    },
  },
  {
    id: "9a25e5117861811d218574501b928d08",
    vis_config: {
      custom_color:""
    },
  },
  {
    id: "ebd76278739d31315c13830811819f8a",
    vis_config: {
      series_colors: {},
    },
  },
  {
    id: "ab6f1f15fc742936f24af78decbd5455",
    vis_config: {
      series_colors: {
        "state.state_median_income": "#E57947",
      },
    },
  },
  {
    id: "706a0bdd8337601d7b80280ee230776e",
    vis_config: {
      map_value_colors: [],
    },
  },
  {
    id: "41364e74cdb03c2032cbc3b62920febf",
    vis_config: {
      series_colors: {},
    },
  },
  {
    id: "f6c7c27e725dde95253579346d066559",
    vis_config: {
      series_colors: {},
    },
  },
  {
    id: "ba563b0321362ca45873a5b1ad9f3ef0",
    vis_config: {
      series_colors: {
        "blockgroup.employed_pop": "#FFD95F",
        "blockgroup.unemployed_pop": "#E57947",
      },
    },
  },
  {
    id: "d3db31621cb046736c7a37ebd46fb312",
    vis_config: {
      map_value_colors: [],
    },
  },
  {
    id: "706a0bdd8337601d7b80280ee230776e",
    vis_config: {
      series_colors: {
        "state.state_percent_income_spent_on_rent": "#E57947",
        "state.state_median_income": "#B42F37",
      },
    },
  },
  {
    id: "1e129b695870a7212f35b9c4eb2fe7c7",
    vis_config: {
      map_value_colors: [],
    },
  },
  {
    id: "42e1631e732bd16c5f647511f986d6b6",
    vis_config: {
      map_value_colors: [],
    },
  },
  {
    id: "74385e207fdf4e7b12c9036719ac762b",
    vis_config: {
      map_value_colors: [],
    },
  },
];
