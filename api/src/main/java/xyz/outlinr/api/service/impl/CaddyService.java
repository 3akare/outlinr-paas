package xyz.outlinr.api.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import xyz.outlinr.api.dto.enums.DeploymentStatus;
import xyz.outlinr.api.entity.Deployment;
import xyz.outlinr.api.repository.DeploymentRepository;

import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class CaddyService {
    private final DeploymentRepository deploymentRepository;
    private final ObjectMapper objectMapper;

    @Value("${outlinr.caddy.admin.url}")
    private String caddyAdminUrl;

    @Value("${outlinr.domain}")
    private String domain;

    @Value("${outlinr.caddy.upstream.host}")
    private String upstreamHost;

    private final RestClient restClient = RestClient.create();

    @EventListener(ApplicationReadyEvent.class)
    public void syncRoutesOnStartup() {
        log.info("Syncing Caddy routes from database on startup...");
        
        try {
            restClient.put()
                .uri(caddyAdminUrl + "/config/apps/http/servers/main/routes")
                .contentType(MediaType.APPLICATION_JSON)
                .body("[]")
                .retrieve()
                .toBodilessEntity();
            log.info("Cleared existing Caddy routes list atomically for route sync.");
        } catch (Exception e) {
            log.warn("Could not clear Caddy routes on startup (Caddy may be uninitialized or blank config): {}", e.getMessage());
        }

        List<Deployment> activeDeployments = deploymentRepository.findByStatus(DeploymentStatus.ACTIVE.name());
        for (Deployment deployment : activeDeployments) {
            try {
                addRoute(
                    deployment.getApp().getName(),
                    deployment.getApp().getAppPort(),
                    deployment.getId()
                );
            } catch (Exception e) {
                log.error("Failed to sync Caddy route for deploymentId={}: {}", deployment.getId(), e.getMessage());
            }
        }
        log.info("Caddy route sync complete. {} active routes registered.", activeDeployments.size());
    }

    public void addRoute(String appName, Integer appPort, java.util.UUID deploymentId) {
        String subdomain = appName + "." + domain;
        String upstream = "outlinr-" + deploymentId + ":" + appPort;
        Map<String, Object> route = Map.of(
            "@id", "route-" + deploymentId,
            "match", List.of(
                Map.of(
                    "host", List.of(subdomain)
                )
            ),
            "handle", List.of(
                Map.of(
                    "handler", "reverse_proxy",
                    "upstreams", List.of(
                        Map.of(
                            "dial", upstream
                        )
                    )
                )
            )
        );

        try {
            String body = objectMapper.writeValueAsString(route);
            restClient.post()
                .uri(caddyAdminUrl + "/config/apps/http/servers/main/routes")
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .retrieve()
                .toBodilessEntity();
            log.info("Caddy route added: {} → {}", subdomain, upstream);
        } catch (Exception e) {
            throw new RuntimeException("Failed to register Caddy route for " + subdomain, e);
        }
    }

    public void removeRoute(java.util.UUID deploymentId) {
        try {
            restClient.delete()
                .uri(caddyAdminUrl + "/id/route-" + deploymentId)
                .retrieve()
                .toBodilessEntity();
            log.info("Caddy route removed for deploymentId={}", deploymentId);
        } catch (Exception e) {
            log.warn("Could not remove Caddy route for deploymentId={}: {}", deploymentId, e.getMessage());
        }
    }
}
