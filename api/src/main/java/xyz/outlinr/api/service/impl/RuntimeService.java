package xyz.outlinr.api.service.impl;

import com.github.dockerjava.api.DockerClient;
import com.github.dockerjava.api.command.CreateContainerResponse;
import com.github.dockerjava.api.command.InspectContainerResponse;
import com.github.dockerjava.api.command.HealthState;
import com.github.dockerjava.api.model.HostConfig;
import com.github.dockerjava.api.model.RestartPolicy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import xyz.outlinr.api.dto.deploy.BuildJobPayload;
import xyz.outlinr.api.dto.enums.DeploymentStatus;
import xyz.outlinr.api.entity.Deployment;
import xyz.outlinr.api.repository.DeploymentRepository;
import xyz.outlinr.api.repository.EnvironmentVariableRepository;

import java.io.FileInputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class RuntimeService {
    private final DockerClient dockerClient;
    private final DeploymentRepository deploymentRepository;
    private final EnvironmentVariableRepository environmentVariableRepository;
    private final CaddyService caddyService;

    public void run(Deployment deployment, Path imageTarPath, String imageTag, BuildJobPayload payload) {
        UUID deploymentId = payload.getDeploymentId();
        UUID appId = payload.getAppId();
        Integer appPort = payload.getAppPort();

        try {
            log.info("Loading Image tar from deploymentId={} imageTag={}", deploymentId, imageTag);
            loadImageTar(imageTarPath);
            deleteTarQuietly(imageTarPath);
            log.info("Image loaded successfully. imageTag={}", imageTag);

            List<String> envVars = environmentVariableRepository.findByAppId(appId)
                .stream()
                .map(e -> e.getKey() + "=" + e.getValue())
                .toList();

            deployment.setStatus(DeploymentStatus.STARTING.name());
            deploymentRepository.save(deployment);

            // Directly run the container on the outlinr-network shared bridge
            String containerId = runContainer(imageTag, envVars, deploymentId);
            deployment.setContainerId(containerId);
            deploymentRepository.save(deployment);
            log.info("Container started successfully. deploymentId={} containerId={}", deploymentId, containerId);

            boolean healthy = waitForHealthy(containerId, deploymentId);

            if (!healthy) {
                handleFailedStart(deployment, containerId);
                return;
            }

            caddyService.addRoute(deployment.getApp().getName(), appPort, deploymentId);

            deployment.setStatus(DeploymentStatus.ACTIVE.name());
            deploymentRepository.save(deployment);

            log.info("Deployment {} is ACTIVE at {}.outlinr.xyz", deploymentId, deployment.getApp().getName());
            stopPreviousDeployment(appId, deploymentId);

        } catch (Exception e) {
            log.error("Runtime failed for deploymentId={}: {}", deploymentId, e.getMessage(), e);
            deployment.setStatus(DeploymentStatus.FAILED.name());
            deployment.setErrorMessage(e.getMessage());
            deploymentRepository.save(deployment);
        }
    }

    private String runContainer(String imageTag, List<String> envVars, UUID deploymentId) {
        CreateContainerResponse container = dockerClient.createContainerCmd(imageTag)
            .withName("outlinr-" + deploymentId)
            .withHostConfig(
                HostConfig.newHostConfig()
                    .withNetworkMode("outlinr-network") // Join Caddy's shared network
                    .withRestartPolicy(RestartPolicy.unlessStoppedRestart())
                    .withMemory(512 * 1024 * 1024L)
            )
            .withEnv(envVars)
            .exec();

        dockerClient.startContainerCmd(container.getId()).exec();
        return container.getId();
    }

    private boolean waitForHealthy(String containerId, UUID deploymentId) throws InterruptedException {
        int maxAttempts = 15;
        int attempt = 0;

        while (attempt < maxAttempts) {
            Thread.sleep(2000);
            attempt++;
            InspectContainerResponse inspect = dockerClient.inspectContainerCmd(containerId).exec();
            InspectContainerResponse.ContainerState state = inspect.getState();

            if (Boolean.FALSE.equals(state.getRunning())) {
                log.warn("Container {} stopped unexpectedly during health check.", containerId);
                return false;
            }

            if (inspect.getConfig() != null && inspect.getConfig().getHealthcheck() == null) {
                log.info("No HEALTHCHECK defined in image configuration. Container is running - treating as healthy immediately. deploymentId={}", deploymentId);
                return true;
            }

            HealthState health = state.getHealth();
            if (health == null) {
                if (attempt >= 5) {
                    log.info("No HEALTHCHECK defined. Container is running — treating as healthy. deploymentId={}", deploymentId);
                    return true;
                }
            } else {
                String status = health.getStatus();
                log.info("[health][{}] attempt={} status={}", deploymentId, attempt, status);
                if ("healthy".equals(status)) {
                    return true;
                }
                if ("unhealthy".equals(status)) {
                    log.warn("Container {} reported unhealthy.", containerId);
                    return false;
                }
            }
        }

        log.warn("Health check timed out after 30 seconds for containerId={}", containerId);
        return false;
    }

    private void handleFailedStart(Deployment deployment, String containerId) {
        log.error("Container failed to start for deploymentId={}: {}", deployment.getId(), "Container did not become healthy within 30 seconds.");

        try {
            dockerClient.stopContainerCmd(containerId).exec();
            dockerClient.removeContainerCmd(containerId).exec();
        } catch (Exception e) {
            log.warn("Could not clean up failed container {}: {}", containerId, e.getMessage());
        }

        deployment.setStatus(DeploymentStatus.FAILED.name());
        deployment.setErrorMessage("Container did not become healthy within 30 seconds.");
        deploymentRepository.save(deployment);
    }

    private void stopPreviousDeployment(UUID appId, UUID newDeploymentId) {
        Optional<Deployment> previousOpt = deploymentRepository.findByAppIdAndStatusAndIdNot(appId, DeploymentStatus.ACTIVE.name(), newDeploymentId);

        if (previousOpt.isEmpty()) {
            log.info("No previous active deployment found for appId={}. First deploy.", appId);
            return;
        }

        Deployment previous = previousOpt.get();
        UUID previousId = previous.getId();
        log.info("Stopping previous deployment. deploymentId={}", previousId);

        caddyService.removeRoute(previousId);
        if (previous.getContainerId() != null) {
            try {
                dockerClient.stopContainerCmd(previous.getContainerId()).withTimeout(10).exec();
                dockerClient.removeContainerCmd(previous.getContainerId()).withRemoveVolumes(false).exec();
                log.info("Old container stopped and removed. containerId={}", previous.getContainerId());
            } catch (Exception e) {
                log.warn("Could not stop old container {}: {}", previous.getContainerId(), e.getMessage());
            }
        }
        previous.setStatus(DeploymentStatus.SUPERSEDED.name());
        deploymentRepository.save(previous);
        log.info("Previous deployment {} marked as SUPERSEDED.", previousId);
    }

    private void loadImageTar(Path imageTarPath) throws Exception {
        try (FileInputStream fis = new FileInputStream(imageTarPath.toFile())) {
            dockerClient.loadImageCmd(fis).exec();
        }
    }

    private void deleteTarQuietly(Path imageTarPath) {
        try {
            Files.deleteIfExists(imageTarPath);
        } catch (IOException e) {
            log.warn("Could not delete image tar {}: {}", imageTarPath, e.getMessage());
        }
    }
}
