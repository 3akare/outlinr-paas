package xyz.outlinr.api.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import xyz.outlinr.api.dto.deploy.BuildJobPayload;
import xyz.outlinr.api.dto.deploy.DeployRequest;
import xyz.outlinr.api.dto.enums.DeploymentStatus;
import xyz.outlinr.api.entity.App;
import xyz.outlinr.api.entity.Deployment;
import xyz.outlinr.api.repository.DeploymentRepository;
import xyz.outlinr.api.service.BuildQueueService;
import xyz.outlinr.api.service.GitService;
import xyz.outlinr.api.service.GithubAppService;

import java.nio.file.Path;

@Slf4j
@Service
@RequiredArgsConstructor
public class AsyncDeploymentTask {
    private final GitService gitService;
    private final GithubAppService githubAppService;
    private final BuildQueueService buildQueueService;
    private final DeploymentRepository deploymentRepository;

    @Async
    public void startDeployment(Deployment deployment, DeployRequest deployRequest, App app, String githubInstallationId) {
        log.info("Starting async deployment for deploymentId={}", deployment.getId());
        try {
            String installationToken = githubAppService.getInstallationToken(githubInstallationId);

            Path clonePath = gitService.cloneRepository(
                    deployRequest.getRepoFullName(),
                    app.getBranch(),
                    installationToken,
                    deployment.getId()
            );

            if (!gitService.hasDockerfile(clonePath)) {
                throw new IllegalArgumentException("Dockerfile not found in the cloned repository.");
            }

            BuildJobPayload payload = new BuildJobPayload();
            payload.setDeploymentId(deployment.getId());
            payload.setAppId(app.getId());
            payload.setRepoFullName(deployRequest.getRepoFullName());
            payload.setBranch(app.getBranch());
            payload.setGithubInstallationId(githubInstallationId);
            payload.setAppPort(app.getAppPort());

            buildQueueService.push(payload);
            log.info("Successfully queued build job for deploymentId={}", deployment.getId());

            deployment.setStatus(DeploymentStatus.QUEUED.name());
            deploymentRepository.save(deployment);
        } catch (Exception e) {
            log.error("Deployment failed for deploymentId={}", deployment.getId(), e);
            deployment.setStatus(DeploymentStatus.FAILED.name());
            deployment.setErrorMessage(e.getMessage());
            deploymentRepository.save(deployment);
        }
    }
}
