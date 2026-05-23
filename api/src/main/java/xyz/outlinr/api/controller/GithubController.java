package xyz.outlinr.api.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import xyz.outlinr.api.config.ApplicationUrl;
import xyz.outlinr.api.service.GithubAppService;
import xyz.outlinr.api.dto.DefaultApiResponse;

import java.net.URI;

@Slf4j
@RestController
@RequestMapping(ApplicationUrl.BASE_GITHUB_URL)
@RequiredArgsConstructor
public class GithubController {
    @Value("${outlinr.client.url}")
    private String clientUrl;

    private final GithubAppService githubAppService;

    @GetMapping(ApplicationUrl.INSTALLATION_CALLBACK)
    public ResponseEntity<Void> handleInstallationCallback(
            @RequestParam("installation_id") String installationId) {
        log.info("Inside GithubController.handleInstallationCallback. installationId: {}", installationId);
        URI redirectUri = URI.create(clientUrl + "/dashboard?installation_id=" + installationId);
        return ResponseEntity.status(302).location(redirectUri).build();
    }

    @PostMapping(ApplicationUrl.INSTALLATION_SAVE)
    public ResponseEntity<DefaultApiResponse<?>> saveInstallation(
            @RequestParam("installation_id") String installationId,
            @AuthenticationPrincipal String userId) {
        log.info("Inside GithubController.saveInstallation. userId: {}, installationId: {}", userId, installationId);
        githubAppService.saveInstallationId(userId, installationId);
        return ResponseEntity.ok(DefaultApiResponse.success(null));
    }

    @GetMapping(ApplicationUrl.REPOSITORY_LIST)
    public ResponseEntity<DefaultApiResponse<?>> getInstalledRepos(@AuthenticationPrincipal String userId) {
        log.info("Inside GithubController.getInstalledRepos. userId: {}", userId);
        return ResponseEntity.ok(DefaultApiResponse.success(githubAppService.getInstalledRepos(userId)));
    }
}