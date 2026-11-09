// Copyright 2026 Google LLC
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

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import javax.servlet.http.HttpServletRequest;
import java.io.UnsupportedEncodingException;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Pattern;

@Configuration
@RestController
@RestControllerAdvice
public class SessionAuthController {

    private static final long RATE_LIMIT_WINDOW_MS = 60_000L;
    private static final int MAX_LOGIN_ATTEMPTS = 10;
    private static final int MAX_TRACKED_BUCKETS = 4096;
    private static final Pattern DISPLAY_NAME_PATTERN =
            Pattern.compile("^[\\p{L}\\p{N} .,'_-]{0,64}$");

    private static final class AttemptWindow {
        int count;
        long resetAtMs;

        AttemptWindow(int count, long resetAtMs) {
            this.count = count;
            this.resetAtMs = resetAtMs;
        }
    }

    private final Map<String, AttemptWindow> loginAttempts = new ConcurrentHashMap<>();
    private final LookerApiServer lookerApiServer;

    @Autowired
    public SessionAuthController(LookerApiServer lookerApiServer) {
        this.lookerApiServer = lookerApiServer;
    }

    @Bean
    public WebMvcConfigurer corsConfigurer(Environment env) {
        final String allowedOrigin =
                env.getProperty("PBL_FRONTEND_ORIGIN", "https://localhost:3001");
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                registry.addMapping("/api/**")
                        .allowedOrigins(allowedOrigin)
                        .allowedMethods("GET", "POST", "OPTIONS")
                        .allowCredentials(true);
            }
        };
    }

    private boolean isBucketLimited(String bucketKey, long now) {
        if (bucketKey == null) {
            return false;
        }
        AttemptWindow window = loginAttempts.get(bucketKey);
        if (window == null) {
            return false;
        }
        synchronized (window) {
            if (now >= window.resetAtMs) {
                loginAttempts.remove(bucketKey, window);
                return false;
            }
            return window.count >= MAX_LOGIN_ATTEMPTS;
        }
    }

    private void incrementBucket(String bucketKey, long now) {
        if (bucketKey == null) {
            return;
        }
        AttemptWindow existing = loginAttempts.get(bucketKey);
        if (existing != null) {
            synchronized (existing) {
                if (now < existing.resetAtMs) {
                    existing.count += 1;
                    return;
                }
            }
        }
        if (loginAttempts.size() >= MAX_TRACKED_BUCKETS) {
            loginAttempts.entrySet().removeIf(entry -> now >= entry.getValue().resetAtMs);
            if (loginAttempts.size() >= MAX_TRACKED_BUCKETS) {
                return;
            }
        }
        loginAttempts.put(bucketKey, new AttemptWindow(1, now + RATE_LIMIT_WINDOW_MS));
    }

    private boolean isRateLimited(String remoteIp, String username) {
        long now = System.currentTimeMillis();
        if (remoteIp != null && isBucketLimited("ip:" + remoteIp, now)) {
            return true;
        }
        if (lookerApiServer.isConfiguredUser(username)
                && isBucketLimited("user:" + username, now)) {
            return true;
        }
        return false;
    }

    private void recordFailedAttempt(String remoteIp, String username) {
        long now = System.currentTimeMillis();
        if (remoteIp != null) {
            incrementBucket("ip:" + remoteIp, now);
        }
        if (lookerApiServer.isConfiguredUser(username)) {
            incrementBucket("user:" + username, now);
        }
    }

    private boolean isAllowedPostOrigin(HttpHeaders headers) {
        String origin = LookerApiServer.getFirstHeaderValue(headers, "Origin");
        if (origin == null || origin.trim().isEmpty()) {
            return true;
        }
        String normalizedOrigin = origin.trim().toLowerCase(Locale.ROOT);
        Environment env = lookerApiServer.getEnvironment();
        String configuredOrigin =
                env.getProperty("PBL_FRONTEND_ORIGIN", "https://localhost:3001")
                        .trim()
                        .toLowerCase(Locale.ROOT);
        if (normalizedOrigin.equals(configuredOrigin)) {
            return true;
        }
        String host = LookerApiServer.getFirstHeaderValue(headers, "Host");
        if (host != null && !host.trim().isEmpty()) {
            String normalizedHost = host.trim().toLowerCase(Locale.ROOT);
            if (normalizedOrigin.equals("https://" + normalizedHost)
                    || normalizedOrigin.equals("http://" + normalizedHost)) {
                return true;
            }
        }
        return false;
    }

    private boolean isHttpsRequest(HttpServletRequest request, HttpHeaders headers) {
        Environment env = lookerApiServer.getEnvironment();
        String explicitOverride = env != null ? env.getProperty("PBL_COOKIE_SECURE") : null;
        if ("true".equalsIgnoreCase(explicitOverride)) {
            return true;
        }
        if ("false".equalsIgnoreCase(explicitOverride)) {
            return false;
        }
        if (request != null && request.isSecure()) {
            return true;
        }
        String proto = LookerApiServer.getFirstHeaderValue(headers, "X-Forwarded-Proto");
        if (proto != null && !proto.isEmpty()) {
            String firstHop = proto.split(",", 2)[0].trim();
            return "https".equalsIgnoreCase(firstHop);
        }
        return false;
    }

    private String buildSessionCookieHeader(
            String token, long maxAgeSeconds, HttpServletRequest request, HttpHeaders headers) {
        return ResponseCookie.from(LookerApiServer.SESSION_COOKIE_NAME, token)
                .path("/api")
                .httpOnly(true)
                .sameSite("Strict")
                .secure(isHttpsRequest(request, headers))
                .maxAge(Duration.ofSeconds(Math.max(0L, maxAgeSeconds)))
                .build()
                .toString();
    }

    private Map<String, Object> buildPublicSessionProfile(String username) {
        Environment env = lookerApiServer.getEnvironment();
        Map<String, Object> profile = new LinkedHashMap<>();
        String prefix = "authenticatedUser." + username + ".";
        String firstName = env.getProperty(prefix + "first_name");
        String lastName = env.getProperty(prefix + "last_name");
        List<String> models =
                LookerApiServer.parseConfiguredModels(env.getProperty(prefix + "models"));
        @SuppressWarnings("unchecked")
        List<String> permissions =
                (List<String>) env.getProperty(prefix + "permissions", List.class);
        int sessionLength = lookerApiServer.getConfiguredSessionLength(username);

        profile.put("first_name", firstName != null ? firstName : "");
        profile.put("last_name", lastName != null ? lastName : "");
        profile.put("models", models);
        profile.put("permissions", permissions != null ? permissions : Collections.emptyList());
        profile.put("session_length", sessionLength);
        return profile;
    }

    @PostMapping(
            value = "/api/login",
            consumes = MediaType.APPLICATION_JSON_VALUE,
            produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Map<String, Object>> login(
            @RequestBody(required = false) Map<String, Object> body,
            @RequestHeader HttpHeaders headers,
            HttpServletRequest request) {
        if (!isAllowedPostOrigin(headers)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Collections.singletonMap("error", "Origin not allowed"));
        }

        String username =
                body != null && body.get("username") instanceof String
                        ? (String) body.get("username")
                        : null;
        String password =
                body != null && body.get("password") instanceof String
                        ? (String) body.get("password")
                        : null;

        String remoteIp = request != null ? request.getRemoteAddr() : null;
        if (isRateLimited(remoteIp, username)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(
                            Collections.singletonMap(
                                    "error", "Too many login attempts. Please try again later."));
        }

        lookerApiServer.getAuthSecretOrThrow();

        if (!lookerApiServer.verifyUserPassword(username, password)) {
            recordFailedAttempt(remoteIp, username);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Collections.singletonMap("error", "Invalid credentials"));
        }

        if (remoteIp != null) {
            loginAttempts.remove("ip:" + remoteIp);
        }
        Map<String, Object> profile = buildPublicSessionProfile(username);
        int ttlSeconds = (Integer) profile.get("session_length");
        String token = lookerApiServer.createSessionToken(username, ttlSeconds);

        Map<String, Object> responseBody = new LinkedHashMap<>();
        responseBody.put("authenticated", true);
        responseBody.put("user", username);
        responseBody.put("expires_in", ttlSeconds);
        responseBody.put("profile", profile);

        return ResponseEntity.ok()
                .header(
                        HttpHeaders.SET_COOKIE,
                        buildSessionCookieHeader(token, ttlSeconds, request, headers))
                .body(responseBody);
    }

    @PostMapping(value = "/api/logout", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Map<String, Object>> logout(
            @RequestHeader HttpHeaders headers, HttpServletRequest request) {
        if (!isAllowedPostOrigin(headers)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Collections.singletonMap("error", "Origin not allowed"));
        }
        return ResponseEntity.ok()
                .header(
                        HttpHeaders.SET_COOKIE,
                        buildSessionCookieHeader("", 0, request, headers))
                .body(Collections.singletonMap("authenticated", false));
    }

    @GetMapping(value = "/api/session", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Map<String, Object>> session(@RequestHeader HttpHeaders headers) {
        lookerApiServer.getAuthSecretOrThrow();
        String verifiedUser = lookerApiServer.authenticateRequest(headers);
        Map<String, Object> responseBody = new LinkedHashMap<>();
        responseBody.put("authenticated", true);
        responseBody.put("user", verifiedUser);
        responseBody.put("profile", buildPublicSessionProfile(verifiedUser));
        return ResponseEntity.ok(responseBody);
    }

    @PostMapping(
            value = "/api/sso-url",
            consumes = MediaType.APPLICATION_JSON_VALUE,
            produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Map<String, String>> ssoUrl(
            @RequestBody(required = false) Map<String, Object> body,
            @RequestHeader HttpHeaders headers)
            throws NoSuchAlgorithmException, UnsupportedEncodingException, InvalidKeyException {
        if (!isAllowedPostOrigin(headers)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Collections.singletonMap("error", "Origin not allowed"));
        }
        String verifiedUser = lookerApiServer.authenticateRequest(headers);
        Environment env = lookerApiServer.getEnvironment();
        String host = env.getProperty("LOOKERSDK_EMBED_HOST");
        String secret = env.getProperty("LOOKERSDK_EMBED_SECRET");
        if (host == null || host.trim().isEmpty() || secret == null || secret.trim().isEmpty()) {
            throw new IllegalStateException("Embed host or secret is not configured");
        }
        if (body == null) {
            throw new IllegalArgumentException("Request body must be a JSON object");
        }

        Object targetUrlObj = body.get("target_url");
        if (!(targetUrlObj instanceof String)) {
            throw new IllegalArgumentException("target_url must be a valid /embed/ path");
        }
        String targetUrl = (String) targetUrlObj;
        LookerApiServer.validateEmbedTargetUrl(targetUrl);

        String prefix = "authenticatedUser." + verifiedUser + ".";
        String serverExternalUserId = env.getProperty(prefix + "external_user_id");
        String serverExternalGroupId = env.getProperty(prefix + "external_group_id");
        String serverTimezone = env.getProperty(prefix + "user_timezone");
        String serverLocale = lookerApiServer.getConfiguredLocale(verifiedUser);

        if (body.containsKey("external_user_id")
                && !Objects.equals(body.get("external_user_id"), serverExternalUserId)) {
            throw new SecurityException("Forbidden");
        }
        if (body.containsKey("external_group_id")
                && !Objects.equals(body.get("external_group_id"), serverExternalGroupId)) {
            throw new SecurityException("Forbidden");
        }
        if (body.containsKey("user_timezone")
                && !Objects.equals(body.get("user_timezone"), serverTimezone)) {
            throw new SecurityException("Forbidden");
        }
        if (body.containsKey("user_attributes")) {
            Object uaObj = body.get("user_attributes");
            if (!(uaObj instanceof Map)) {
                throw new IllegalArgumentException("user_attributes must be an object");
            }
            Map<String, Object> expectedUa = Collections.singletonMap("locale", serverLocale);
            if (!expectedUa.equals(uaObj)) {
                throw new SecurityException("Forbidden");
            }
        }
        if (body.containsKey("access_filters")) {
            Object afObj = body.get("access_filters");
            if (!(afObj instanceof Map)) {
                throw new IllegalArgumentException("access_filters must be an object");
            }
            if (!((Map<?, ?>) afObj).isEmpty()) {
                throw new SecurityException("Forbidden");
            }
        }

        @SuppressWarnings("unchecked")
        List<Integer> allowedGroupIdsRaw =
                (List<Integer>) env.getProperty(prefix + "group_ids", List.class);
        List<Integer> allowedGroupIds =
                allowedGroupIdsRaw != null ? allowedGroupIdsRaw : Collections.emptyList();
        ArrayList<Integer> boundedGroupIds =
                allowedGroupIdsRaw != null ? new ArrayList<>(allowedGroupIdsRaw) : null;
        if (body.containsKey("group_ids")) {
            Object gidsObj = body.get("group_ids");
            if (!(gidsObj instanceof List)) {
                throw new IllegalArgumentException("group_ids must be an array");
            }
            List<?> reqGids = (List<?>) gidsObj;
            ArrayList<Integer> filtered = new ArrayList<>();
            for (Object item : reqGids) {
                if (!(item instanceof Number)) {
                    throw new SecurityException("Forbidden");
                }
                int gid = ((Number) item).intValue();
                if (!allowedGroupIds.contains(gid)) {
                    throw new SecurityException("Forbidden");
                }
            }
            for (Integer allowed : allowedGroupIds) {
                for (Object item : reqGids) {
                    if (((Number) item).intValue() == allowed) {
                        filtered.add(allowed);
                        break;
                    }
                }
            }
            boundedGroupIds = filtered;
        }

        @SuppressWarnings("unchecked")
        List<String> allowedPermsRaw =
                (List<String>) env.getProperty(prefix + "permissions", List.class);
        List<String> allowedPerms =
                allowedPermsRaw != null ? allowedPermsRaw : Collections.emptyList();
        List<String> boundedPerms = new ArrayList<>(allowedPerms);
        if (body.containsKey("permissions")) {
            Object permsObj = body.get("permissions");
            if (!(permsObj instanceof List) || ((List<?>) permsObj).isEmpty()) {
                throw new IllegalArgumentException("permissions must be a non-empty array");
            }
            List<?> reqPerms = (List<?>) permsObj;
            for (Object p : reqPerms) {
                if (!(p instanceof String) || !allowedPerms.contains(p)) {
                    throw new SecurityException("Forbidden");
                }
            }
            boundedPerms = new ArrayList<>();
            for (String allowed : allowedPerms) {
                if (reqPerms.contains(allowed)) {
                    boundedPerms.add(allowed);
                }
            }
        }

        List<String> allowedModels =
                LookerApiServer.parseConfiguredModels(env.getProperty(prefix + "models"));
        List<String> boundedModels = new ArrayList<>(allowedModels);
        if (body.containsKey("models")) {
            Object modelsObj = body.get("models");
            if (!(modelsObj instanceof List) || ((List<?>) modelsObj).isEmpty()) {
                throw new IllegalArgumentException("models must be a non-empty array");
            }
            List<?> reqModels = (List<?>) modelsObj;
            for (Object m : reqModels) {
                if (!(m instanceof String) || !allowedModels.contains(m)) {
                    throw new SecurityException("Forbidden");
                }
            }
            boundedModels = new ArrayList<>();
            for (String allowed : allowedModels) {
                if (reqModels.contains(allowed)) {
                    boundedModels.add(allowed);
                }
            }
        }

        int maxSessionLength = lookerApiServer.getConfiguredSessionLength(verifiedUser);
        int sessionLength = maxSessionLength;
        if (body.containsKey("session_length")) {
            Object lenObj = body.get("session_length");
            int parsedLen;
            if (lenObj instanceof Number) {
                double d = ((Number) lenObj).doubleValue();
                if (d != Math.rint(d)) {
                    throw new IllegalArgumentException("Invalid session_length");
                }
                parsedLen = ((Number) lenObj).intValue();
            } else if (lenObj instanceof String) {
                try {
                    parsedLen = Integer.parseInt(((String) lenObj).trim());
                } catch (NumberFormatException e) {
                    throw new IllegalArgumentException("Invalid session_length");
                }
            } else {
                throw new IllegalArgumentException("Invalid session_length");
            }
            if (parsedLen < 60 || parsedLen > maxSessionLength) {
                throw new IllegalArgumentException(
                        "session_length must be between 60 and " + maxSessionLength);
            }
            sessionLength = parsedLen;
        }

        String serverFirstName = env.getProperty(prefix + "first_name");
        String serverLastName = env.getProperty(prefix + "last_name");
        String firstName =
                body.get("first_name") instanceof String
                        && !((String) body.get("first_name")).trim().isEmpty()
                        && DISPLAY_NAME_PATTERN.matcher((String) body.get("first_name")).matches()
                        ? ((String) body.get("first_name")).trim()
                        : serverFirstName;
        String lastName =
                body.get("last_name") instanceof String
                        && !((String) body.get("last_name")).trim().isEmpty()
                        && DISPLAY_NAME_PATTERN.matcher((String) body.get("last_name")).matches()
                        ? ((String) body.get("last_name")).trim()
                        : serverLastName;

        String signedUrl =
                lookerApiServer.buildSignedEmbedUrl(
                        targetUrl,
                        serverExternalUserId,
                        firstName,
                        lastName,
                        sessionLength,
                        lookerApiServer.getConfiguredForceLogoutLogin(verifiedUser),
                        serverExternalGroupId,
                        boundedGroupIds,
                        boundedModels,
                        boundedPerms,
                        serverLocale,
                        serverTimezone,
                        host,
                        secret);
        return ResponseEntity.ok(Collections.singletonMap("url", signedUrl));
    }

    @ExceptionHandler(SecurityException.class)
    public ResponseEntity<Map<String, String>> handleSecurityException(SecurityException ex) {
        HttpStatus status =
                "Forbidden".equals(ex.getMessage()) ? HttpStatus.FORBIDDEN : HttpStatus.UNAUTHORIZED;
        return ResponseEntity.status(status)
                .body(Collections.singletonMap("error", ex.getMessage()));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> handleBadRequest(IllegalArgumentException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Collections.singletonMap("error", ex.getMessage()));
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<Map<String, String>> handleServerConfigError(IllegalStateException ex) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Collections.singletonMap("error", ex.getMessage()));
    }
}
