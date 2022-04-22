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
import com.google.gson.GsonBuilder;
import org.apache.commons.codec.binary.Hex;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.UnsupportedEncodingException;
import java.net.HttpURLConnection;
import java.net.URISyntaxException;
import java.net.URL;
import java.net.URLEncoder;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.*;

import static java.lang.Integer.parseInt;

@SpringBootApplication
@RestController
public class LookerApiServer {

    private String lookerAPIuri;
    private String lookerAPILoginUri;
    private String client_id;
    private String client_secret;

    @Autowired
    private Environment env;

    public static void main(String[] args) {
        SpringApplication.run(LookerApiServer.class, args);
    }

    private void init() {

        this.client_id = env.getProperty("client_id");
        this.client_secret = env.getProperty("client_secret");

        this.lookerAPIuri = env.getProperty("LOOKER_API_URL");  // "https://<instance>.looker.com/api/4.0";
        this.lookerAPILoginUri = this.lookerAPIuri + "/login";
    }

    private String LookerAPICallNoParams(String api_url) throws URISyntaxException, IOException, InterruptedException {

        LookerBearerToken bearerToken = new LookerBearerToken(client_id, client_secret, lookerAPILoginUri);
        URL url = new URL(api_url);

        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestProperty("Content-Type", "application/json");
        conn.setRequestProperty("Authorization", "Bearer " + LookerBearerToken.getBearer_token());
        conn.setRequestMethod("GET");

        BufferedReader br = new BufferedReader(new InputStreamReader((conn.getInputStream())));
        StringBuilder sb = new StringBuilder();
        String output;
        while ((output = br.readLine()) != null) {
            sb.append(output);
        }
        conn.disconnect();

        return sb.toString();
    }

    private String signEmbedUrl(SSOSignatureParams data, String secret) throws NoSuchAlgorithmException, UnsupportedEncodingException, InvalidKeyException {

        List<Object> stringsToSign = new ArrayList<>();
        Gson gson = new Gson();

        // Format all values other than host and embed url as JSON
        // Concentrate values with \n
        // Order is relevant

        // convert empty group ID to "[]"
        String groupids = null;
        if (data.getGroup_ids() == null) {
            groupids = "[]";
        } else {
            groupids = gson.toJson(data.getGroup_ids());
        }

        String string_toSign = data.getHost() + "\n" +
                data.getEmbed_path() + "\n" +
                gson.toJson(data.getNonce()) + "\n" +
                gson.toJson(data.getTime()) + "\n" +
                gson.toJson(data.getSession_length()) + "\n" +
                gson.toJson(data.getExternal_user_id()) + "\n" +
                gson.toJson(data.getPermissions()) + "\n" +
                "[" + gson.toJson(data.getModels()) + "]" + "\n" +
                groupids + "\n" +
                gson.toJson(data.getExternal_group_id()) + "\n" +

                // gson.toJson(data.getUser_attributes()) + "\n" +  // not = {"locale":"en_US"}
                "{\"locale\":\"en_US\"}" + "\n" +  // not = {"locale":"en_US"}

                // gson.toJson(data.getAccess_filters()) + "\n" ;  // should be {} not "{}"
                "{}";  // should be {} not "{}"

        //        System.out.println("string_toSign: \n" + string_toSign);

        // HMAC sign with embed secret
        // Docs say HmacSHA256 is default used but it acutally seems to be HmacSHA1
        Mac sha256_HMAC = Mac.getInstance("HmacSHA1");
        SecretKeySpec secret_key = new SecretKeySpec(secret.getBytes("UTF-8"), "HmacSHA1");
        sha256_HMAC.init(secret_key);

        //    return (Hex.encodeHexString(sha256_HMAC.doFinal(string_toSign.getBytes("UTF-8"))));
        return (Base64.getEncoder().encodeToString(sha256_HMAC.doFinal(string_toSign.getBytes("UTF-8"))));

        // createHmac('sha1', secret).update(forceUnicodeEncoding(stringToSign)).digest('base64').trim()
        // Or return the hash encoded in Base64:
        //  Base64.encodeBase64String(sha256_HMAC.doFinal(string_toSign.getBytes("UTF-8")));

    }

    private String uri_param_encode(String param_to_encode) {
        String encoded_param = null;

        try {
            encoded_param = URLEncoder.encode(param_to_encode, java.nio.charset.StandardCharsets.UTF_8.toString());
        } catch (UnsupportedEncodingException e) {
            e.printStackTrace();
        }

        return (encoded_param);
    }


    private String createSignedUrl(String src, String user, String host, String secret)
            throws NoSuchAlgorithmException, UnsupportedEncodingException, InvalidKeyException {


        // Both of these overlap significantly, maybe combine in future, matching NODE version for now.
        SignedURLParams Params = new SignedURLParams();
        SSOSignatureParams SignatureParams = new SSOSignatureParams();

        Params.setNonce(createNonce(16));
        Params.setExternal_user_id(env.getProperty("authenticatedUser." + user + ".external_user_id"));
        Params.setFirst_name(env.getProperty("authenticatedUser." + user + ".first_name"));
        Params.setLast_name(env.getProperty("authenticatedUser." + user + ".last_name"));
        Params.setSession_length(parseInt(Objects.requireNonNull(env.getProperty("authenticatedUser." + user + ".session_length"))));
        Params.setForce_logout_login(Boolean.parseBoolean(env.getProperty("authenticatedUser." + user + ".force_logout_login")));
        Params.setExternal_group_id(env.getProperty("authenticatedUser." + user + ".external_group_id"));
        // Params.setModels(  env.getProperty("authenticatedUser." + user + ".models", Arrays.class));
        Params.setModels(env.getProperty("authenticatedUser." + user + ".models"));
        Params.setPermissions((List<String>) env.getProperty("authenticatedUser." + user + ".permissions", List.class));
        Params.setUser_timezone(env.getProperty("authenticatedUser." + user + ".user_timezone"));
        Params.setTime(Instant.now().toEpochMilli() / 1000);

        // TODO Handle user_attributes: JSON.stringify(user.user_attributes)


        Params.setUser_timezone("{\"locale\":\"en_US\"}");

        // Missing params / need to test for future
        /*
        access_filters
        user_timezone  // implemented but empty
        group_ids
        */

        Gson gson = new GsonBuilder().create();
        String jsonParams = gson.toJson(Params);// obj is your object

        final String encoded_url = URLEncoder.encode(src, java.nio.charset.StandardCharsets.UTF_8.toString());
        final String embedPath = "/login/embed/" + encoded_url;

        // Set up SSOSigningParams, pulling most from Params which was already populated above
        SignatureParams.setHost(host);
        SignatureParams.setEmbed_path(embedPath);
        SignatureParams.setNonce(Params.getNonce());
        SignatureParams.setTime(Params.getTime());
        SignatureParams.setSession_length(Params.getSession_length());
        SignatureParams.setExternal_user_id(Params.getExternal_user_id());
        SignatureParams.setPermissions(Params.getPermissions());
        SignatureParams.setModels(Params.getModels());
//      group_ids: params.group_ids,
//      user_attributes: params.user_attributes,
        SignatureParams.setExternal_group_id(Params.getExternal_group_id());

//  Todo   access_filters: params.access_filters


        String jsonSigningParams = gson.toJson(SignatureParams);// obj is your object
//        System.out.println(" SignatureParams@: " + jsonSigningParams );

        final String signature = signEmbedUrl(SignatureParams, secret);

//        System.out.println("signature: " + signature);
        Params.setSignature(signature);

        // String encoded_parameters = URLEncoder.encode(gson.toJson(Params),  java.nio.charset.StandardCharsets.UTF_8.toString());

        // Going to do this param by param for debugging
        // This request includes 'user_timezone' param and User Time Zones are disabled


        String groupids = null;
        if (Params.getGroup_ids() == null) {
            groupids = "[]";
        } else {
            groupids = gson.toJson(Params.getGroup_ids());
        }

        final String encoded_param_list = "nonce=" + uri_param_encode("\"" + Params.getNonce() + "\"") +
                "&external_user_id=" + uri_param_encode("\"" + Params.getExternal_user_id() + "\"") +
                "&first_name=" + uri_param_encode("\"" + Params.getFirst_name() + "\"") +
                "&last_name=" + uri_param_encode("\"" + Params.getLast_name() + "\"") +
                "&session_length=" + uri_param_encode(String.valueOf(Params.getSession_length())) +
                "&group_ids=" + uri_param_encode(groupids) +
                "&external_group_id=" + uri_param_encode("\"" + Params.getExternal_group_id() + "\"") +
                // "&models=" + uri_param_encode( gson.toJson(Params.getModels() ) ) +
                "&models=" + uri_param_encode("[\"" + Params.getModels() + "\"]") +
                "&permissions=" + uri_param_encode(gson.toJson(Params.getPermissions())) +
                "&user_attributes=" + "%7B%22locale%22%3A%22en_US%22%7D" +                       // todo
                // "&user_timezone=" + uri_param_encode("") +
                "&time=" + uri_param_encode(String.valueOf(Params.getTime())) +
                "&access_filters=" + uri_param_encode(Params.getAccess_filters()) +
                "&force_logout_login=" + uri_param_encode("true") +               // todo
                "&signature=" + uri_param_encode(Params.getSignature());
                // final String url = "https://" + host + embedPath + "?" + gson.toJson(Params);  // stringify(params)}
        final String url = "https://" + host + embedPath + "?" + encoded_param_list;  // stringify(params)}

//        System.out.println("url: " + url);
        return (url);
    }

    private String createNonce(int stringLength) throws NoSuchAlgorithmException {

        int leftLimit = 97;
        int rightLimit = 122;

        Random random = new Random();
        StringBuilder buffer = new StringBuilder(stringLength);

        for (int i = 0; i < stringLength; i++) {
            int randomLimitedInt = leftLimit + (int)
                    (random.nextFloat() * (rightLimit - leftLimit + 1));
            buffer.append((char) randomLimitedInt);
        }
        return (buffer.toString());
    }

    // Get details of the current authenticated user
    @GetMapping(value = "/api/me", produces = MediaType.APPLICATION_JSON_VALUE)
    public String me() throws URISyntaxException, IOException, InterruptedException {
        init();
        return (LookerAPICallNoParams(this.lookerAPIuri + "/user"));
    }

    // Get a list of all looks the authenticated user can access
    @GetMapping(value = "/api/looks", produces = MediaType.APPLICATION_JSON_VALUE)
    public String looks() throws URISyntaxException, IOException, InterruptedException {
        init();
        return (LookerAPICallNoParams(this.lookerAPIuri + "/looks"));
    }

    // @GetMapping(value = "/api/auth", produces = MediaType.APPLICATION_JSON_VALUE)
    @RequestMapping(value = "/api/auth", method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
    public String auth(
            @RequestParam Map<String, String> allParams,
            // @PathVariable(required=false) String src,
            @RequestHeader("usertoken") String usertoken,
            @RequestHeader HttpHeaders headers)
            throws NoSuchAlgorithmException, UnsupportedEncodingException, InvalidKeyException {

        System.out.println("api-auth -  " + java.time.LocalDateTime.now());

        init();

        final String host = env.getProperty("LOOKERSDK_EMBED_HOST");
        final String secret = env.getProperty("LOOKERSDK_EMBED_SECRET");

        //  const url = createSignedUrl(src, user, host, secret);
        final String signed_url = createSignedUrl(allParams.get("src"), headers.get("usertoken").get(0), host, secret);

        Map<String, String> url = new HashMap<String, String>();
        url.put("url", signed_url);

        Gson gson = new GsonBuilder().create();
        String url_json = gson.toJson(url);

        return (url_json);
    }


    @RequestMapping(value = "/api/embed-user/token", method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
    public void auth(@RequestParam Map<String, String> allParams, @RequestHeader HttpHeaders headers) {
        /* Future if needed
        // NODE
        const userCred = await sdk.ok(sdk.user_for_credential('embed', req.query.id));
        const embed_user_token = await sdk.login_user(userCred.id.toString())
        const u = {
            user_token: embed_user_token.value,
            token_last_refreshed: Date.now()
        }
        res.json({ ...u });
         */

        System.out.println("API-/embed-user/token\"");
    }
}


