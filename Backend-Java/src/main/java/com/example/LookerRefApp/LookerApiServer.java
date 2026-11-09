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
import java.net.URLDecoder;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.*;
import java.util.regex.Pattern;

@SpringBootApplication
@RestController
public class LookerApiServer {

    static final String SESSION_COOKIE_NAME = "pbl_session";
    static final int DEFAULT_TTL_SECONDS = 3600;
    private static final int MAX_TTL_SECONDS = 86400;
    private static final int MIN_SECRET_LENGTH = 32;
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final Pattern USER_ID_PATTERN = Pattern.compile("^[A-Za-z0-9_-]{1,64}$");
    private static final Pattern SEGMENT_PATTERN = Pattern.compile("^[A-Za-z0-9_-]+$");
    private static final Pattern RAW_ENCODED_PATH_ANOMALY =
            Pattern.compile("(?i)%2e|%2f|%5c|%25|%00");
    private static final List<String> PLACEHOLDER_SUBSTRINGS =
            Arrays.asList(
                    "SESSION-SECRET",
                    "SESSION_SECRET",
                    "USER1-PASSWORD",
                    "USER2-PASSWORD",
                    "USER1_PASSWORD",
                    "USER2_PASSWORD",
                    "CHANGE_ME",
                    "CHANGEME",
                    "YOUR_");

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
        this.lookerAPIuri = env.getProperty("LOOKER_API_URL");
        this.lookerAPILoginUri = this.lookerAPIuri + "/login";
    }

    Environment getEnvironment() {
        return this.env;
    }

    static boolean isPlaceholderValue(String raw) {
        if (raw == null) {
            return true;
        }
        String trimmed = raw.trim();
        if (trimmed.isEmpty() || "<>".equals(trimmed)) {
            return true;
        }
        if ((trimmed.startsWith("{") && trimmed.endsWith("}"))
                || (trimmed.startsWith("[") && trimmed.endsWith("]"))
                || (trimmed.startsWith("<") && trimmed.endsWith(">"))) {
            return true;
        }
        String upper = trimmed.toUpperCase(Locale.ROOT);
        for (String marker : PLACEHOLDER_SUBSTRINGS) {
            if (upper.contains(marker)) {
                return true;
            }
        }
        return false;
    }

    static boolean isValidAuthSecret(String secret) {
        return secret != null
                && secret.trim().length() >= MIN_SECRET_LENGTH
                && !isPlaceholderValue(secret);
    }

    String getAuthSecretOrThrow() {
        String secret = env != null ? env.getProperty("PBL_AUTH_SECRET") : null;
        if (!isValidAuthSecret(secret)) {
            throw new IllegalStateException(
                    "Server authentication is not configured (PBL_AUTH_SECRET must be a non-placeholder secret of at least 32 characters)");
        }
        return secret;
    }

    private static byte[] sha256(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return digest.digest(value.getBytes(StandardCharsets.UTF_8));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 unavailable", e);
        }
    }

    private static byte[] hmacSha256(String signingInput, String secret) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec keySpec =
                    new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            mac.init(keySpec);
            return mac.doFinal(signingInput.getBytes(StandardCharsets.UTF_8));
        } catch (NoSuchAlgorithmException | InvalidKeyException e) {
            throw new IllegalStateException("Unable to compute HMAC-SHA256", e);
        }
    }

    private static String base64UrlEncode(byte[] bytes) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private static byte[] base64UrlDecode(String input) {
        if (input == null || input.isEmpty()) {
            return null;
        }
        for (int i = 0; i < input.length(); i++) {
            char c = input.charAt(i);
            boolean valid =
                    (c >= 'A' && c <= 'Z')
                            || (c >= 'a' && c <= 'z')
                            || (c >= '0' && c <= '9')
                            || c == '-'
                            || c == '_';
            if (!valid) {
                return null;
            }
        }
        try {
            return Base64.getUrlDecoder().decode(input);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    private static int skipJsonWhitespace(String s, int idx, int end) {
        int i = idx;
        while (i < end) {
            char c = s.charAt(i);
            if (c == ' ' || c == '\t' || c == '\r' || c == '\n') {
                i++;
            } else {
                break;
            }
        }
        return i;
    }

    /**
     * Strict parser for flat JSON claim objects containing only unescaped string and non-negative
     * integer values. Rejects duplicate keys, nested structures, floats, escapes, and trailing data.
     */
    static Map<String, Object> parseFlatJsonClaims(String json) {
        if (json == null) {
            return null;
        }
        String trimmed = json.trim();
        if (trimmed.length() < 2
                || trimmed.charAt(0) != '{'
                || trimmed.charAt(trimmed.length() - 1) != '}') {
            return null;
        }
        int end = trimmed.length() - 1;
        int i = skipJsonWhitespace(trimmed, 1, end);
        Map<String, Object> claims = new LinkedHashMap<>();
        if (i == end) {
            return claims;
        }

        while (i < end) {
            if (trimmed.charAt(i) != '"') {
                return null;
            }
            int keyStart = i + 1;
            int keyEnd = keyStart;
            while (keyEnd < end) {
                char c = trimmed.charAt(keyEnd);
                if (c == '\\' || c < 0x20) {
                    return null;
                }
                if (c == '"') {
                    break;
                }
                keyEnd++;
            }
            if (keyEnd >= end) {
                return null;
            }
            String key = trimmed.substring(keyStart, keyEnd);
            i = skipJsonWhitespace(trimmed, keyEnd + 1, end);
            if (i >= end || trimmed.charAt(i) != ':') {
                return null;
            }
            i = skipJsonWhitespace(trimmed, i + 1, end);
            if (i >= end) {
                return null;
            }

            Object parsedValue;
            char valChar = trimmed.charAt(i);
            if (valChar == '"') {
                int valStart = i + 1;
                int valEnd = valStart;
                while (valEnd < end) {
                    char c = trimmed.charAt(valEnd);
                    if (c == '\\' || c < 0x20) {
                        return null;
                    }
                    if (c == '"') {
                        break;
                    }
                    valEnd++;
                }
                if (valEnd >= end) {
                    return null;
                }
                parsedValue = trimmed.substring(valStart, valEnd);
                i = valEnd + 1;
            } else if (valChar >= '0' && valChar <= '9') {
                int numStart = i;
                while (i < end && trimmed.charAt(i) >= '0' && trimmed.charAt(i) <= '9') {
                    i++;
                }
                try {
                    parsedValue = Long.parseLong(trimmed.substring(numStart, i));
                } catch (NumberFormatException e) {
                    return null;
                }
            } else {
                return null;
            }

            if (claims.putIfAbsent(key, parsedValue) != null) {
                return null;
            }

            i = skipJsonWhitespace(trimmed, i, end);
            if (i == end) {
                break;
            }
            if (trimmed.charAt(i) != ',') {
                return null;
            }
            i = skipJsonWhitespace(trimmed, i + 1, end);
            if (i >= end) {
                return null;
            }
        }
        return claims;
    }

    boolean isConfiguredUser(String username) {
        if (env == null || username == null || !USER_ID_PATTERN.matcher(username).matches()) {
            return false;
        }
        String externalUserId = env.getProperty("authenticatedUser." + username + ".external_user_id");
        return externalUserId != null && !externalUserId.trim().isEmpty();
    }

    boolean verifyUserPassword(String username, String password) {
        if (!isConfiguredUser(username)
                || password == null
                || password.isEmpty()
                || password.length() > 256) {
            return false;
        }
        String configuredPassword = env.getProperty("authenticatedUser." + username + ".password");
        if (configuredPassword == null || configuredPassword.trim().isEmpty()) {
            String envKey = "PBL_" + username.toUpperCase(Locale.ROOT) + "_PASSWORD";
            configuredPassword = env.getProperty(envKey);
        }
        if (isPlaceholderValue(configuredPassword)) {
            return false;
        }
        return MessageDigest.isEqual(sha256(password), sha256(configuredPassword));
    }

    String createSessionToken(String username, int ttlSeconds) {
        String secret = getAuthSecretOrThrow();
        if (username == null || !USER_ID_PATTERN.matcher(username).matches()) {
            throw new IllegalArgumentException("Invalid username");
        }
        int boundedTtl =
                Math.min(
                        Math.max(ttlSeconds > 0 ? ttlSeconds : DEFAULT_TTL_SECONDS, 60),
                        MAX_TTL_SECONDS);
        long issuedAt = Instant.now().getEpochSecond();
        long expiresAt = issuedAt + boundedTtl;
        String headerJson = "{\"alg\":\"HS256\",\"typ\":\"JWT\"}";
        String payloadJson =
                "{\"sub\":\"" + username + "\",\"iat\":" + issuedAt + ",\"exp\":" + expiresAt + "}";
        String signingInput =
                base64UrlEncode(headerJson.getBytes(StandardCharsets.UTF_8))
                        + "."
                        + base64UrlEncode(payloadJson.getBytes(StandardCharsets.UTF_8));
        String signatureB64 = base64UrlEncode(hmacSha256(signingInput, secret));
        return signingInput + "." + signatureB64;
    }

    String verifySessionToken(String token) {
        if (token == null || token.isEmpty() || token.length() > 2048 || env == null) {
            return null;
        }
        String secret = env.getProperty("PBL_AUTH_SECRET");
        if (!isValidAuthSecret(secret)) {
            return null;
        }
        String[] parts = token.split("\\.", -1);
        if (parts.length != 3 || parts[0].isEmpty() || parts[1].isEmpty() || parts[2].isEmpty()) {
            return null;
        }
        byte[] providedSig = base64UrlDecode(parts[2]);
        if (providedSig == null || providedSig.length != 32) {
            return null;
        }
        byte[] expectedSig = hmacSha256(parts[0] + "." + parts[1], secret);
        if (!MessageDigest.isEqual(providedSig, expectedSig)) {
            return null;
        }

        byte[] headerBytes = base64UrlDecode(parts[0]);
        byte[] payloadBytes = base64UrlDecode(parts[1]);
        if (headerBytes == null || payloadBytes == null) {
            return null;
        }
        Map<String, Object> headerClaims =
                parseFlatJsonClaims(new String(headerBytes, StandardCharsets.UTF_8));
        Map<String, Object> payloadClaims =
                parseFlatJsonClaims(new String(payloadBytes, StandardCharsets.UTF_8));
        if (headerClaims == null || payloadClaims == null) {
            return null;
        }

        if (!"HS256".equals(headerClaims.get("alg")) || !"JWT".equals(headerClaims.get("typ"))) {
            return null;
        }

        Object subObj = payloadClaims.get("sub");
        Object iatObj = payloadClaims.get("iat");
        Object expObj = payloadClaims.get("exp");
        if (!(subObj instanceof String)
                || !(iatObj instanceof Long)
                || !(expObj instanceof Long)) {
            return null;
        }
        String subject = (String) subObj;
        long issuedAt = (Long) iatObj;
        long expiresAt = (Long) expObj;
        if (!USER_ID_PATTERN.matcher(subject).matches()) {
            return null;
        }

        long nowSec = Instant.now().getEpochSecond();
        if (issuedAt > nowSec + 60
                || nowSec >= expiresAt
                || (expiresAt - issuedAt) > MAX_TTL_SECONDS) {
            return null;
        }

        if (!isConfiguredUser(subject)) {
            return null;
        }
        return subject;
    }

    static String getFirstHeaderValue(HttpHeaders headers, String name) {
        if (headers == null) {
            return null;
        }
        List<String> values = headers.get(name);
        if (values != null && !values.isEmpty()) {
            return values.get(0);
        }
        List<String> lowerValues = headers.get(name.toLowerCase(Locale.ROOT));
        if (lowerValues != null && !lowerValues.isEmpty()) {
            return lowerValues.get(0);
        }
        return null;
    }

    static String extractTokenFromHeaders(HttpHeaders headers) {
        String authHeader = getFirstHeaderValue(headers, "Authorization");
        if (authHeader != null) {
            String trimmed = authHeader.trim();
            if (trimmed.length() > 7 && trimmed.regionMatches(true, 0, "Bearer ", 0, 7)) {
                String bearer = trimmed.substring(7).trim();
                if (!bearer.isEmpty() && !bearer.contains(" ")) {
                    return bearer;
                }
            }
        }
        String cookieHeader = getFirstHeaderValue(headers, "Cookie");
        if (cookieHeader != null && !cookieHeader.isEmpty()) {
            String[] pairs = cookieHeader.split(";");
            for (String pair : pairs) {
                int eqIdx = pair.indexOf('=');
                if (eqIdx <= 0) {
                    continue;
                }
                String key = pair.substring(0, eqIdx).trim();
                if (SESSION_COOKIE_NAME.equals(key)) {
                    String rawVal = pair.substring(eqIdx + 1).trim();
                    try {
                        return URLDecoder.decode(
                                rawVal.replace("+", "%2B"), StandardCharsets.UTF_8.name());
                    } catch (UnsupportedEncodingException | IllegalArgumentException e) {
                        return rawVal;
                    }
                }
            }
        }
        return null;
    }

    String authenticateRequest(HttpHeaders headers) {
        String secret = env != null ? env.getProperty("PBL_AUTH_SECRET") : null;
        if (!isValidAuthSecret(secret)) {
            throw new SecurityException("Authentication is not configured");
        }
        String token = extractTokenFromHeaders(headers);
        String verifiedUser = verifySessionToken(token);
        if (verifiedUser == null) {
            throw new SecurityException("Authentication required");
        }
        return verifiedUser;
    }

    static void validateEmbedTargetUrl(String src) {
        if (src == null || src.isEmpty() || src.length() > 4096) {
            throw new IllegalArgumentException("Invalid embed src path");
        }
        for (int i = 0; i < src.length(); i++) {
            char c = src.charAt(i);
            if (c <= 0x1F || c == 0x7F || c == '\\' || c == '#') {
                throw new IllegalArgumentException("Invalid embed src path");
            }
        }
        int queryIdx = src.indexOf('?');
        String pathPart = queryIdx >= 0 ? src.substring(0, queryIdx) : src;
        if (RAW_ENCODED_PATH_ANOMALY.matcher(pathPart).find()) {
            throw new IllegalArgumentException("Invalid embed src path");
        }
        String decodedPath;
        try {
            decodedPath =
                    URLDecoder.decode(
                            pathPart.replace("+", "%2B"), StandardCharsets.UTF_8.name());
            String redecoded =
                    URLDecoder.decode(
                            decodedPath.replace("+", "%2B"), StandardCharsets.UTF_8.name());
            if (!decodedPath.equals(redecoded)) {
                throw new IllegalArgumentException("Invalid embed src path");
            }
        } catch (UnsupportedEncodingException e) {
            throw new IllegalArgumentException("Invalid embed src path");
        }
        if (decodedPath.indexOf('\\') >= 0) {
            throw new IllegalArgumentException("Invalid embed src path");
        }
        String[] segments = decodedPath.split("/", -1);
        if (segments.length < 3 || !segments[0].isEmpty() || !"embed".equals(segments[1])) {
            throw new IllegalArgumentException("Invalid embed src path");
        }
        if (!SEGMENT_PATTERN.matcher(segments[2]).matches()) {
            throw new IllegalArgumentException("Invalid embed src path");
        }
        for (int i = 1; i < segments.length; i++) {
            String seg = segments[i];
            if (seg.isEmpty() || ".".equals(seg) || "..".equals(seg)) {
                throw new IllegalArgumentException("Invalid embed src path");
            }
        }
    }

    static List<String> parseConfiguredModels(String rawModels) {
        if (rawModels == null || rawModels.trim().isEmpty()) {
            return Collections.emptyList();
        }
        List<String> result = new ArrayList<>();
        for (String item : rawModels.split(",")) {
            String trimmed = item.trim();
            if (!trimmed.isEmpty()) {
                result.add(trimmed);
            }
        }
        return result;
    }

    int getConfiguredSessionLength(String user) {
        String raw = env.getProperty("authenticatedUser." + user + ".session_length");
        if (raw == null || raw.trim().isEmpty()) {
            return DEFAULT_TTL_SECONDS;
        }
        try {
            return Integer.parseInt(raw.trim());
        } catch (NumberFormatException e) {
            return DEFAULT_TTL_SECONDS;
        }
    }

    String getConfiguredLocale(String user) {
        String locale = env.getProperty("authenticatedUser." + user + ".user_attributes.locale");
        return (locale != null && !locale.trim().isEmpty()) ? locale.trim() : "en_US";
    }

    boolean getConfiguredForceLogoutLogin(String user) {
        String raw = env.getProperty("authenticatedUser." + user + ".force_logout_login");
        if (raw == null || raw.trim().isEmpty()) {
            return true;
        }
        return Boolean.parseBoolean(raw.trim());
    }

    private static String formatJsonStringArray(List<String> items, Gson gson) {
        if (items == null || items.isEmpty()) {
            return "[]";
        }
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < items.size(); i++) {
            if (i > 0) {
                sb.append(",");
            }
            sb.append(gson.toJson(items.get(i)));
        }
        sb.append("]");
        return sb.toString();
    }

    private String LookerAPICallNoParams(String api_url)
            throws URISyntaxException, IOException, InterruptedException {
        LookerBearerToken bearerToken =
                new LookerBearerToken(client_id, client_secret, lookerAPILoginUri);
        URL url = new URL(api_url);

        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestProperty("Content-Type", "application/json");
        conn.setRequestProperty("Authorization", "Bearer " + LookerBearerToken.getBearer_token());
        conn.setRequestMethod("GET");

        BufferedReader br =
                new BufferedReader(
                        new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8));
        StringBuilder sb = new StringBuilder();
        String output;
        while ((output = br.readLine()) != null) {
            sb.append(output);
        }
        conn.disconnect();

        return sb.toString();
    }

    private String signEmbedUrl(
            SSOSignatureParams data,
            String modelsJsonArray,
            String userAttributesJson,
            String secret)
            throws NoSuchAlgorithmException, UnsupportedEncodingException, InvalidKeyException {
        Gson gson = new Gson();

        String groupids;
        if (data.getGroup_ids() == null) {
            groupids = "[]";
        } else {
            groupids = gson.toJson(data.getGroup_ids());
        }

        String string_toSign =
                data.getHost() + "\n" +
                data.getEmbed_path() + "\n" +
                gson.toJson(data.getNonce()) + "\n" +
                gson.toJson(data.getTime()) + "\n" +
                gson.toJson(data.getSession_length()) + "\n" +
                gson.toJson(data.getExternal_user_id()) + "\n" +
                gson.toJson(data.getPermissions()) + "\n" +
                modelsJsonArray + "\n" +
                groupids + "\n" +
                gson.toJson(data.getExternal_group_id()) + "\n" +
                userAttributesJson + "\n" +
                "{}";

        Mac sha1Hmac = Mac.getInstance("HmacSHA1");
        SecretKeySpec secret_key =
                new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA1");
        sha1Hmac.init(secret_key);

        return Base64.getEncoder()
                .encodeToString(sha1Hmac.doFinal(string_toSign.getBytes(StandardCharsets.UTF_8)));
    }

    private String uri_param_encode(String param_to_encode) {
        return URLEncoder.encode(param_to_encode, StandardCharsets.UTF_8);
    }

    String buildSignedEmbedUrl(
            String src,
            String externalUserId,
            String firstName,
            String lastName,
            int sessionLength,
            boolean forceLogoutLogin,
            String externalGroupId,
            ArrayList<Integer> groupIds,
            List<String> modelsList,
            List<String> permissions,
            String locale,
            String userTimezone,
            String host,
            String secret)
            throws NoSuchAlgorithmException, UnsupportedEncodingException, InvalidKeyException {

        SignedURLParams Params = new SignedURLParams();
        SSOSignatureParams SignatureParams = new SSOSignatureParams();
        Gson gson = new GsonBuilder().create();

        Params.setNonce(createNonce(16));
        Params.setExternal_user_id(externalUserId);
        Params.setFirst_name(firstName);
        Params.setLast_name(lastName);
        Params.setSession_length(sessionLength);
        Params.setForce_logout_login(forceLogoutLogin);
        Params.setExternal_group_id(externalGroupId);
        Params.setGroup_ids(groupIds);
        Params.setModels(modelsList.isEmpty() ? "" : String.join(",", modelsList));
        Params.setPermissions(permissions);
        Params.setUser_timezone(userTimezone);
        Params.setTime(Instant.now().toEpochMilli() / 1000);

        final String encoded_url =
                URLEncoder.encode(src, StandardCharsets.UTF_8).replace("+", "%20");
        final String embedPath = "/login/embed/" + encoded_url;
        final String modelsJsonArray = formatJsonStringArray(modelsList, gson);
        final String userAttributesJson = "{\"locale\":" + gson.toJson(locale) + "}";

        SignatureParams.setHost(host);
        SignatureParams.setEmbed_path(embedPath);
        SignatureParams.setNonce(Params.getNonce());
        SignatureParams.setTime(Params.getTime());
        SignatureParams.setSession_length(Params.getSession_length());
        SignatureParams.setExternal_user_id(Params.getExternal_user_id());
        SignatureParams.setPermissions(Params.getPermissions());
        SignatureParams.setModels(Params.getModels());
        SignatureParams.setGroup_ids(Params.getGroup_ids());
        SignatureParams.setExternal_group_id(Params.getExternal_group_id());

        final String signature =
                signEmbedUrl(SignatureParams, modelsJsonArray, userAttributesJson, secret);
        Params.setSignature(signature);

        String groupids = Params.getGroup_ids() == null ? "[]" : gson.toJson(Params.getGroup_ids());

        final String encoded_param_list =
                "nonce=" + uri_param_encode("\"" + Params.getNonce() + "\"") +
                "&external_user_id=" + uri_param_encode("\"" + Params.getExternal_user_id() + "\"") +
                "&first_name=" + uri_param_encode("\"" + Params.getFirst_name() + "\"") +
                "&last_name=" + uri_param_encode("\"" + Params.getLast_name() + "\"") +
                "&session_length=" + uri_param_encode(String.valueOf(Params.getSession_length())) +
                "&group_ids=" + uri_param_encode(groupids) +
                "&external_group_id=" + uri_param_encode("\"" + Params.getExternal_group_id() + "\"") +
                "&models=" + uri_param_encode(modelsJsonArray) +
                "&permissions=" + uri_param_encode(gson.toJson(Params.getPermissions())) +
                "&user_attributes=" + uri_param_encode(userAttributesJson) +
                "&time=" + uri_param_encode(String.valueOf(Params.getTime())) +
                "&access_filters=" + uri_param_encode(Params.getAccess_filters()) +
                "&force_logout_login=" + uri_param_encode(String.valueOf(Params.isForce_logout_login())) +
                "&signature=" + uri_param_encode(Params.getSignature());

        return "https://" + host + embedPath + "?" + encoded_param_list;
    }

    private String createSignedUrl(String src, String user, String host, String secret)
            throws NoSuchAlgorithmException, UnsupportedEncodingException, InvalidKeyException {
        @SuppressWarnings("unchecked")
        List<String> permissions =
                (List<String>) env.getProperty("authenticatedUser." + user + ".permissions", List.class);
        @SuppressWarnings("unchecked")
        List<Integer> rawGroupIds =
                (List<Integer>) env.getProperty("authenticatedUser." + user + ".group_ids", List.class);
        ArrayList<Integer> groupIds = rawGroupIds != null ? new ArrayList<>(rawGroupIds) : null;

        return buildSignedEmbedUrl(
                src,
                env.getProperty("authenticatedUser." + user + ".external_user_id"),
                env.getProperty("authenticatedUser." + user + ".first_name"),
                env.getProperty("authenticatedUser." + user + ".last_name"),
                getConfiguredSessionLength(user),
                getConfiguredForceLogoutLogin(user),
                env.getProperty("authenticatedUser." + user + ".external_group_id"),
                groupIds,
                parseConfiguredModels(env.getProperty("authenticatedUser." + user + ".models")),
                permissions != null ? permissions : Collections.emptyList(),
                getConfiguredLocale(user),
                env.getProperty("authenticatedUser." + user + ".user_timezone"),
                host,
                secret);
    }

    private String createNonce(int stringLength) {
        final String alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        StringBuilder buffer = new StringBuilder(stringLength);
        for (int i = 0; i < stringLength; i++) {
            buffer.append(alphabet.charAt(SECURE_RANDOM.nextInt(alphabet.length())));
        }
        return buffer.toString();
    }

    // Get details of the current authenticated Looker API user
    @GetMapping(value = "/api/me", produces = MediaType.APPLICATION_JSON_VALUE)
    public String me(@RequestHeader HttpHeaders headers)
            throws URISyntaxException, IOException, InterruptedException {
        authenticateRequest(headers);
        init();
        return LookerAPICallNoParams(this.lookerAPIuri + "/user");
    }

    // Get a list of all looks accessible to the configured Looker API user
    @GetMapping(value = "/api/looks", produces = MediaType.APPLICATION_JSON_VALUE)
    public String looks(@RequestHeader HttpHeaders headers)
            throws URISyntaxException, IOException, InterruptedException {
        authenticateRequest(headers);
        init();
        return LookerAPICallNoParams(this.lookerAPIuri + "/looks");
    }

    @RequestMapping(value = "/api/auth", method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
    public String auth(
            @RequestParam Map<String, String> allParams,
            @RequestHeader HttpHeaders headers)
            throws NoSuchAlgorithmException, UnsupportedEncodingException, InvalidKeyException {

        final String verifiedUser = authenticateRequest(headers);
        final String src = allParams != null ? allParams.get("src") : null;
        validateEmbedTargetUrl(src);

        init();

        final String host = env.getProperty("LOOKERSDK_EMBED_HOST");
        final String secret = env.getProperty("LOOKERSDK_EMBED_SECRET");
        if (host == null || host.trim().isEmpty() || secret == null || secret.trim().isEmpty()) {
            throw new IllegalStateException("Embed host or secret is not configured");
        }

        final String signed_url = createSignedUrl(src, verifiedUser, host, secret);

        Map<String, String> url = new HashMap<>();
        url.put("url", signed_url);

        Gson gson = new GsonBuilder().create();
        return gson.toJson(url);
    }

    @Deprecated
    String auth(
            Map<String, String> allParams,
            String ignoredLegacyUserToken,
            HttpHeaders headers)
            throws NoSuchAlgorithmException, UnsupportedEncodingException, InvalidKeyException {
        return auth(allParams, headers);
    }

    @RequestMapping(value = "/api/embed-user/token", method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
    public String embedUserToken(
            @RequestParam Map<String, String> allParams,
            @RequestHeader HttpHeaders headers) {
        final String verifiedUser = authenticateRequest(headers);
        final String expectedExternalId =
                env.getProperty("authenticatedUser." + verifiedUser + ".external_user_id");
        final String requestedId = allParams != null ? allParams.get("id") : null;
        if (requestedId != null && !requestedId.equals(expectedExternalId)) {
            throw new SecurityException("Forbidden");
        }
        return "{}";
    }
}
