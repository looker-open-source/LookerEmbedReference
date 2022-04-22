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

import com.google.gson.Gson;
import lombok.Getter;
import org.apache.http.client.utils.URIBuilder;

import java.io.IOException;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class LookerBearerToken {

    private String client_id;
    private String client_secret;
    private String api_uri;
    @Getter
    private static String bearer_token;

    public LookerBearerToken(String client_id, String client_secret, String api_uri) throws URISyntaxException, IOException, InterruptedException {

        this.client_id = client_id;
        this.client_secret = client_secret;
        this.api_uri = api_uri;

        URI uri = new URIBuilder(this.api_uri)
                .addParameter("client_id", this.client_id)
                .addParameter("client_secret", this.client_secret)
                .build();

            HttpClient client = HttpClient.newHttpClient();

        HttpRequest request = HttpRequest.newBuilder()
                .uri(uri)
                        .POST(HttpRequest.BodyPublishers.noBody())
                        .build();

        HttpResponse<String> response = client.send(request,
                            HttpResponse.BodyHandlers.ofString());

        Gson g = new Gson();
        AuthResponse ar = g.fromJson(response.body(), AuthResponse.class);
        this.bearer_token = ar.getAccess_token();
    }
}
