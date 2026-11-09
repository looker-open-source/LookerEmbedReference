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

package com.example.demo;

import com.example.LookerRefApp.LookerApiServer;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockCookie;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(
        classes = LookerApiServer.class,
        properties = {
            "LOOKERSDK_EMBED_HOST=example.looker.com",
            "LOOKERSDK_EMBED_SECRET=unit-test-embed-secret",
            "PBL_AUTH_SECRET=0123456789abcdef0123456789abcdef0123456789abcdef",
            "PBL_FRONTEND_ORIGIN=https://localhost:3001",
            "authenticatedUser.user1.password=test-user1-pass-9876",
            "authenticatedUser.user1.external_user_id=user1",
            "authenticatedUser.user1.first_name=Pat",
            "authenticatedUser.user1.last_name=Embed",
            "authenticatedUser.user1.session_length=3600",
            "authenticatedUser.user1.force_logout_login=true",
            "authenticatedUser.user1.external_group_id=group1",
            "authenticatedUser.user1.models=data_block_acs_bigquery,secondary_model",
            "authenticatedUser.user1.permissions=access_data,see_looks,see_lookml_dashboards,explore",
            "authenticatedUser.user1.user_attributes.locale=en_US",
            "authenticatedUser.user2.password=test-user2-pass-5432",
            "authenticatedUser.user2.external_user_id=user2",
            "authenticatedUser.user2.first_name=Jane",
            "authenticatedUser.user2.last_name=Doe",
            "authenticatedUser.user2.force_logout_login=false",
            "authenticatedUser.user2.external_group_id=group2",
            "authenticatedUser.user2.models=data_block_acs_bigquery",
            "authenticatedUser.user2.permissions=access_data,see_looks",
            "authenticatedUser.user2.user_attributes.locale=es_US",
            "authenticatedUser.minimalUser.password=test-minimal-pass-1234",
            "authenticatedUser.minimalUser.external_user_id=minimalUser",
            "authenticatedUser.minimalUser.models=data_block_acs_bigquery",
            "authenticatedUser.minimalUser.permissions=access_data",
            "authenticatedUser.placeholderUser.password={USER1-PASSWORD}",
            "authenticatedUser.placeholderUser.external_user_id=placeholderUser"
        })
@AutoConfigureMockMvc
class LookerApiServerTests {

    private static final String TEST_SECRET = "0123456789abcdef0123456789abcdef0123456789abcdef";

    @Autowired
    private MockMvc mockMvc;

    private static String signRawJwt(String headerJson, String payloadJson) throws Exception {
        Base64.Encoder enc = Base64.getUrlEncoder().withoutPadding();
        String signingInput =
                enc.encodeToString(headerJson.getBytes(StandardCharsets.UTF_8))
                        + "."
                        + enc.encodeToString(payloadJson.getBytes(StandardCharsets.UTF_8));
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(TEST_SECRET.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        String sig = enc.encodeToString(mac.doFinal(signingInput.getBytes(StandardCharsets.UTF_8)));
        return signingInput + "." + sig;
    }

    @Test
    void rejectsUnauthenticatedAuthAndSsoUrlRequests() throws Exception {
        mockMvc.perform(
                        get("/api/auth")
                                .param("src", "/embed/dashboards/1")
                                .header("usertoken", "user1"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.url").doesNotExist());

        mockMvc.perform(
                        post("/api/sso-url")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        "{\"target_url\":\"/embed/dashboards/1\",\"external_user_id\":\"user1\"}"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/me")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/looks")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/embed-user/token")).andExpect(status().isUnauthorized());
    }

    @Test
    void rejectsPlaceholderPasswordsCrossOriginPostsAndDuplicateJwtClaims() throws Exception {
        mockMvc.perform(
                        post("/api/login")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        "{\"username\":\"placeholderUser\",\"password\":\"{USER1-PASSWORD}\"}"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(
                        post("/api/login")
                                .header("Origin", "https://other.example.com")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        "{\"username\":\"user1\",\"password\":\"test-user1-pass-9876\"}"))
                .andExpect(status().isForbidden());

        long now = System.currentTimeMillis() / 1000L;
        String duplicateKeyJwt =
                signRawJwt(
                        "{\"alg\":\"HS256\",\"typ\":\"JWT\"}",
                        "{\"sub\":\"user2\",\"sub\":\"user1\",\"iat\":"
                                + now
                                + ",\"exp\":"
                                + (now + 3600)
                                + "}");
        mockMvc.perform(
                        get("/api/auth")
                                .param("src", "/embed/dashboards/1")
                                .header("Authorization", "Bearer " + duplicateKeyJwt))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void loginSessionAuthPathValidationAndBoundedSsoUrlParity() throws Exception {
        MvcResult loginResult =
                mockMvc.perform(
                                post("/api/login")
                                        .header("Origin", "https://localhost:3001")
                                        .header("X-Forwarded-Proto", "https, http")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(
                                                "{\"username\":\"user2\",\"password\":\"test-user2-pass-5432\"}"))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.authenticated").value(true))
                        .andExpect(jsonPath("$.user").value("user2"))
                        .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("HttpOnly")))
                        .andExpect(
                                header().string(
                                        HttpHeaders.SET_COOKIE, containsString("SameSite=Strict")))
                        .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("Secure")))
                        .andReturn();

        MockCookie sessionCookie =
                (MockCookie) loginResult.getResponse().getCookie("pbl_session");
        assertNotNull(sessionCookie);

        // Even if client supplies usertoken: user1, signed URL uses verified session user2 (with es_US locale and default 3600 session_length).
        mockMvc.perform(
                        get("/api/auth")
                                .param("src", "/embed/dashboards/1")
                                .cookie(sessionCookie)
                                .header("usertoken", "user1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.url", containsString("external_user_id=%22user2%22")))
                .andExpect(jsonPath("$.url", not(containsString("external_user_id=%22user1%22"))))
                .andExpect(jsonPath("$.url", containsString("es_US")))
                .andExpect(jsonPath("$.url", containsString("force_logout_login=false")));

        for (String badSrc :
                new String[] {
                    "/admin/users",
                    "/embed/dashboards/../../admin",
                    "/embed/dashboards/%252e%252e/%252e%252e/admin",
                    "/embed/dashboards/%255c..",
                    "/embed/dashboards/1#frag"
                }) {
            mockMvc.perform(get("/api/auth").param("src", badSrc).cookie(sessionCookie))
                    .andExpect(status().isBadRequest());
        }

        // POST /api/sso-url rejects privilege escalation (requesting "explore" not granted to user2).
        mockMvc.perform(
                        post("/api/sso-url")
                                .cookie(sessionCookie)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        "{\"target_url\":\"/embed/dashboards/1\",\"permissions\":[\"access_data\",\"explore\"]}"))
                .andExpect(status().isForbidden());

        // POST /api/sso-url succeeds when requesting a valid subset of user2's permissions and models.
        mockMvc.perform(
                        post("/api/sso-url")
                                .cookie(sessionCookie)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        "{\"target_url\":\"/embed/dashboards/1\",\"permissions\":[\"access_data\"],\"models\":[\"data_block_acs_bigquery\"],\"session_length\":1800}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.url", containsString("external_user_id=%22user2%22")))
                .andExpect(jsonPath("$.url", containsString("session_length=1800")));

        // User2 cannot request embed-user token for user1.
        mockMvc.perform(
                        get("/api/embed-user/token")
                                .param("id", "user1")
                                .cookie(sessionCookie))
                .andExpect(status().isForbidden());
    }

    @Test
    void defaultsNullSsoStringFieldsAndBlankSessionLength() throws Exception {
        MvcResult loginResult =
                mockMvc.perform(
                                post("/api/login")
                                        .header("Origin", "https://localhost:3001")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(
                                                "{\"username\":\"minimalUser\",\"password\":\"test-minimal-pass-1234\"}"))
                        .andExpect(status().isOk())
                        .andReturn();

        MockCookie sessionCookie =
                (MockCookie) loginResult.getResponse().getCookie("pbl_session");
        assertNotNull(sessionCookie);

        mockMvc.perform(
                        get("/api/auth")
                                .param("src", "/embed/dashboards/1")
                                .cookie(sessionCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.url", containsString("external_user_id=%22minimalUser%22")))
                .andExpect(jsonPath("$.url", containsString("first_name=%22%22")))
                .andExpect(jsonPath("$.url", containsString("last_name=%22%22")))
                .andExpect(jsonPath("$.url", containsString("external_group_id=%22%22")))
                .andExpect(jsonPath("$.url", containsString("session_length=3600")))
                .andExpect(jsonPath("$.url", not(containsString("%22null%22"))))
                .andExpect(jsonPath("$.url", not(containsString("=null"))));

        for (String payload :
                new String[] {
                    "{\"target_url\":\"/embed/dashboards/1\",\"session_length\":\"\"}",
                    "{\"target_url\":\"/embed/dashboards/1\",\"session_length\":null}"
                }) {
            mockMvc.perform(
                            post("/api/sso-url")
                                    .cookie(sessionCookie)
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content(payload))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.url", containsString("session_length=3600")))
                    .andExpect(jsonPath("$.url", containsString("first_name=%22%22")))
                    .andExpect(jsonPath("$.url", containsString("last_name=%22%22")))
                    .andExpect(jsonPath("$.url", containsString("external_group_id=%22%22")))
                    .andExpect(jsonPath("$.url", not(containsString("%22null%22"))))
                    .andExpect(jsonPath("$.url", not(containsString("=null"))));
        }

        mockMvc.perform(
                        post("/api/sso-url")
                                .cookie(sessionCookie)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"target_url\":\"/embed/dashboards/1\",\"session_length\":false}"))
                .andExpect(status().isBadRequest());
    }
}
