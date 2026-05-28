package xyz.outlinr.api.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import xyz.outlinr.api.config.ApplicationUrl;
import xyz.outlinr.api.dto.DefaultApiResponse;
import xyz.outlinr.api.dto.deploy.DeployRequest;
import xyz.outlinr.api.service.DeploymentService;

import java.util.UUID;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping(ApplicationUrl.BASE_DEPLOY_URL)
public class DeployController {
    private final DeploymentService deploymentService;

    @PostMapping(ApplicationUrl.DEPLOY_APP)
    public ResponseEntity<DefaultApiResponse<?>> deploy(
            @RequestBody DeployRequest deployRequest,
            @AuthenticationPrincipal UUID userId
    ) {
        log.info("Inside DeployController.deploy. userId: {}", userId);
        return ResponseEntity.ok(DefaultApiResponse.success(deploymentService.deploy(deployRequest, userId)));
    }

    @GetMapping(ApplicationUrl.CHECK_NAME)
    public ResponseEntity<DefaultApiResponse<?>> checkName(
            @RequestParam("name") String name
    ) {
        log.info("Inside DeployController.checkName. name: {}", name);
        return ResponseEntity.ok(DefaultApiResponse.success(deploymentService.checkName(name)));
    }

    @GetMapping(ApplicationUrl.VALIDATE_REPO)
    public ResponseEntity<DefaultApiResponse<?>> validateRepo(
            @RequestParam("repoFullName") String repoFullName,
            @AuthenticationPrincipal UUID userId
    ) {
        log.info("Inside DeployController.validateRepo. repoFullName: {}, userId: {}", repoFullName, userId);
        return ResponseEntity.ok(DefaultApiResponse.success(deploymentService.validateRepo(repoFullName, userId)));
    }

    @GetMapping(ApplicationUrl.DEPLOYMENT_STATUS)
    public ResponseEntity<DefaultApiResponse<?>> getDeploymentStatus(
            @PathVariable UUID deploymentId
    ) {
        log.info("Inside DeployController.getDeploymentStatus. deploymentId: {}", deploymentId);
        return ResponseEntity.ok(DefaultApiResponse.success(deploymentService.getDeploymentStatus(deploymentId)));
    }
 }

