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
public class SignedURLParams {

    private String nonce;
    private String external_user_id;
    private String first_name;
    private String last_name;
    private int session_length;
    private boolean force_logout_login;
    private String external_group_id;
    private ArrayList<Integer> group_ids;  // Array of integers [1,2]
    private String models;
    private List<String> permissions;
    private String access_filters = "{}";   //  Looker 3.10 this parameter was removed, but placeholder is required for signature
    private String user_attributes;
    private String user_timezone;
    private long time;
    private String signature;
}

