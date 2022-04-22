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

package com.example.LookerRefApp;
import lombok.Getter;
import lombok.Setter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;

@Getter
@Setter
public class SSOSignatureParams {
    // POJO : Order props are in are relevant
    private String host;
    private String embed_path;
    private String nonce;
    private long time;
    private int session_length;
    private String external_user_id;
    private List<String> permissions;
    // private ArrayList<String> models;
    private String models;
    private ArrayList<Integer> group_ids;  // Array of integers [1,2]
    private String external_group_id;
    private HashMap user_attributes; // Hash of strings {"vendor" : "34", "ID", "3"}
    private String access_filters = "{}";  // place holder,should be empty
    private String user_timezone;
}


