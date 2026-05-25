package xyz.outlinr.api.service.impl;


import io.jsonwebtoken.Jwts;
import io.micrometer.common.util.StringUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import xyz.outlinr.api.entity.User;
import xyz.outlinr.api.repository.UserRepository;
import xyz.outlinr.api.service.GithubAppService;

import jakarta.annotation.PostConstruct;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.KeyFactory;
import java.security.interfaces.RSAPrivateKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

import lombok.extern.slf4j.Slf4j;

import xyz.outlinr.api.dto.GithubRepositoryDto;
import xyz.outlinr.api.dto.GithubInstallationTokenResponse;
import xyz.outlinr.api.dto.GithubRepositoriesResponse;
import xyz.outlinr.api.dto.CachedToken;

@Slf4j
@Service
public class IGithubAppService implements GithubAppService {
    @Value("${outlinr.github.app-id}")
    private String githubAppId;

    @Value("${outlinr.github.private-key-path}")
    private String githubAppPrivateKeyPath;

    private RSAPrivateKey cachedPrivateKey;

    private final UserRepository userRepository;
    private final RestClient restClient;
    private final Map<String, CachedToken> tokenCache = new ConcurrentHashMap<>();

    public IGithubAppService(UserRepository userRepository, RestClient.Builder restClientBuilder) {
        this.userRepository = userRepository;
        this.restClient = restClientBuilder
            .baseUrl("https://api.github.com")
            .defaultHeader("Accept", "application/vnd.github+json")
            .defaultHeader("X-GitHub-Api-Version", "2022-11-28")
            .build();
    }

    @PostConstruct
    public void init() {
        this.cachedPrivateKey = loadPrivateKey();
    }

    @Override
    public void saveInstallationId(UUID userId, String githubInstallationId) {
        log.info("Saving github installation id: {} for user: {}", githubInstallationId, userId);
        User user = userRepository.findById(userId).orElseThrow(
            () -> new RuntimeException("User not found")
        );
        user.setGithubInstallationId(githubInstallationId);
        userRepository.save(user);
    }

    @Override
    public List<GithubRepositoryDto> getInstalledRepos(UUID userId) {
        User user = userRepository.findById(userId).orElseThrow(
            () -> new RuntimeException("User not found")
        );

        if (StringUtils.isBlank(user.getGithubInstallationId())) {
            log.error("Github installation id not found for user: {}", userId);
            throw new RuntimeException("Github installation id not found");
        }

        log.info("Fetching installed repositories for githubInstallationId: {}", user.getGithubInstallationId());
        String installationToken = getInstallationToken(user.getGithubInstallationId());
        
        GithubRepositoriesResponse response = restClient.get()
            .uri("/installation/repositories")
            .header("Authorization", "Bearer " + installationToken)
            .retrieve()
            .body(GithubRepositoriesResponse.class);
        
        if (response == null) {
            log.warn("Null response when fetching repositories for installation: {}", user.getGithubInstallationId());
            return List.of();
        }

        return response.getRepositories();
    }

    public String getInstallationToken(String installationId) {
        tokenCache.entrySet().removeIf(entry -> entry.getValue().getExpiresAt().isBefore(Instant.now()));

        CachedToken cached = tokenCache.get(installationId);
        if (cached != null && cached.getExpiresAt().isAfter(Instant.now().plusSeconds(60))) {
            log.info("Serving GitHub installation token from cache for installationId: {}", installationId);
            return cached.getToken();
        }

        log.info("Fetching new GitHub installation token from API for installationId: {}", installationId);
        String appJwt = generateAppJwt();
        GithubInstallationTokenResponse response = restClient.post()
            .uri("/app/installations/{id}/access_tokens", installationId)
            .header("Authorization", "Bearer " + appJwt)
            .retrieve()
            .body(GithubInstallationTokenResponse.class);
        
        if (response == null || response.getToken() == null) {
            log.error("Failed to fetch installation token from GitHub API for installationId: {}", installationId);
            throw new RuntimeException("Failed to fetch installation token");
        }

        Instant expiresAt = Instant.parse(response.getExpiresAt());
        tokenCache.put(installationId, new CachedToken(response.getToken(), expiresAt));

        return response.getToken();
    }

    private String generateAppJwt() {
        return Jwts.builder()
            .issuer(githubAppId)
            .issuedAt(new Date())
            .expiration(new Date(System.currentTimeMillis() + 8 * 60 * 1000))
            .signWith(this.cachedPrivateKey)
            .compact();
    }

    private RSAPrivateKey loadPrivateKey() {
        try {
            String pem = Files.readString(Path.of(githubAppPrivateKeyPath));
            String cleaned = pem
                .replace("-----BEGIN PRIVATE KEY-----", "")
                .replace("-----END PRIVATE KEY-----", "")
                .replaceAll("\\s+", "");
            byte[] decoded = Base64.getDecoder().decode(cleaned);
            PKCS8EncodedKeySpec spec = new PKCS8EncodedKeySpec(decoded);
            KeyFactory kf = KeyFactory.getInstance("RSA");
            return (RSAPrivateKey) kf.generatePrivate(spec);
        } catch (Exception e) {
            throw new RuntimeException("Failed to load GitHub App private key", e);
        }
    }
}
